/* Igor Riabtsov — tinnulion.github.io
   1) Loads travel_log.yaml + countries.yaml and renders the travel
      log: year rows of flag images (flagcdn.com), instant hover
      tooltips with full country names, and the live stats line.
   2) Anti-spam contacts: no address is ever present in the HTML or as
      a readable string in this file — everything is stored as char
      codes and the real links are only assembled in JavaScript, one
      second after the page has loaded. */

"use strict";

const $ = (selector) => document.querySelector(selector);

/* ------------------------------------------------------------ secrets */

/* Char codes only: dumb scrapers see nothing, no matter how well they
   parse the HTML or this file. */
const SECRET = {
	email_addr: [116, 105, 110, 110, 117, 108, 105, 111, 110, 64, 103, 109, 97, 105, 108, 46, 99, 111, 109],
	wa_link: [104, 116, 116, 112, 115, 58, 47, 47, 119, 97, 46, 109, 101, 47, 55, 55, 55, 56, 49, 51, 50, 53, 48, 52, 52],
	wa_text: [43, 55, 32, 55, 55, 56, 32, 49, 51, 50, 45, 53, 48, 45, 52, 52],
	li_link: [104, 116, 116, 112, 115, 58, 47, 47, 119, 119, 119, 46, 108, 105, 110, 107, 101, 100, 105, 110, 46, 99, 111, 109, 47, 105, 110, 47, 105, 103, 111, 114, 45, 114, 121, 97, 98, 116, 115, 111, 118],
	li_text: [105, 110, 47, 105, 103, 111, 114, 45, 114, 121, 97, 98, 116, 115, 111, 118]
};

const decode = (codes) => codes.map((code) => String.fromCharCode(code)).join("");

/* ----------------------------------------------------------- contacts */

function makeLink(href, text)
{
	const link = document.createElement("a");
	link.className = "contact-link";
	link.href = href;
	link.textContent = text;
	if (href.startsWith("https:"))
	{
		link.target = "_blank";
		link.rel = "noopener noreferrer";
	}
	return link;
}

const CONTACTS = [
	{
		id: "contact-email",
		build: () => makeLink("mailto:" + decode(SECRET.email_addr), decode(SECRET.email_addr))
	},
	{
		id: "contact-whatsapp",
		build: () => makeLink(decode(SECRET.wa_link), decode(SECRET.wa_text))
	},
	{
		id: "contact-linkedin",
		build: () => makeLink(decode(SECRET.li_link), decode(SECRET.li_text))
	}
];

function setupContacts()
{
	CONTACTS.forEach((contact) =>
	{
		const item = document.getElementById(contact.id);
		const caption = item && item.querySelector(".contact-caption");
		if (!caption) { return; }

		/* Real links replace the joke captions a second after load. */
		window.setTimeout(() => caption.replaceWith(contact.build()), 1000);
	});
}

/* --------------------------------------------------------------- yaml */

/* Strips "# ..." comments — safe here: neither YAML file ever puts a
   "#" inside a quoted value. */
const clean = (line) => line.replace(/(^|\s)#.*$/, "").trim();

/* countries.yaml — mapping of code → { index, slug, name, area }. */
function parseCountries(text)
{
	const countries = {};
	let code = null;

	text.split(/\r?\n/).forEach((raw) =>
	{
		const line = clean(raw);
		if (!line) { return; }

		let match = line.match(/^([a-z]{2,3}):$/i);
		if (match)
		{
			code = match[1].toLowerCase();
			countries[code] = {};
			return;
		}
		match = line.match(/^index:\s*(\d+)\s*$/);
		if (match && code)
		{
			countries[code].index = parseInt(match[1], 10);
			return;
		}
		match = line.match(/^slug:\s*["']?([a-z0-9-]+)["']?\s*$/i);
		if (match && code)
		{
			countries[code].slug = match[1].toLowerCase();
			return;
		}
		match = line.match(/^name:\s*(.+)$/);
		if (match && code)
		{
			countries[code].name = match[1].replace(/^["']|["']$/g, "");
			return;
		}
		match = line.match(/^area:\s*([\d.]+)/);
		if (match && code)
		{
			countries[code].area = parseFloat(match[1]);
		}
	});
	return countries;
}

/* travel_log.yaml — list of { year, countries: [slugs], text? };
   year may be any label, e.g. "2022 – 2025". */
function parseTravels(text)
{
	const items = [];
	let item = null;

	text.split(/\r?\n/).forEach((raw) =>
	{
		const line = clean(raw);
		if (!line) { return; }

		let match = line.match(/^-\s*year:\s*(.+)$/);
		if (match)
		{
			item = {
				year: match[1].replace(/^["']|["']$/g, "").trim(),
				countries: []
			};
			items.push(item);
			return;
		}
		match = line.match(/^countries:\s*\[(.*)\]\s*$/);
		if (match && item)
		{
			item.countries = match[1].split(",")
				.map((code) => code.trim().replace(/^["']|["']$/g, "").toLowerCase())
				.filter(Boolean);
			return;
		}
		match = line.match(/^text:\s*(.+)$/);
		if (match && item)
		{
			item.text = match[1].replace(/^["']|["']$/g, "").trim();
		}
	});
	return items;
}

/* -------------------------------------------------------------- render */

const FLAG_CDN = "https://flagcdn.com";

/* YAML labels may use HTML entities ("2022 &ndash; 2025") — decode
   them for display. Dashes are also accepted without the trailing
   semicolon, which plain HTML would not decode. */
const decodeEntities = (text) =>
{
	const filler = document.createElement("textarea");
	filler.innerHTML = text
		.replace(/&ndash;?/gi, "\u2013")
		.replace(/&mdash;?/gi, "\u2014");
	return filler.value;
};

function flagElement(code, name)
{
	const label = name || code.toUpperCase();
	const img = document.createElement("img");
	img.className = "flag";
	img.alt = label;
	img.width = 32; /* layout hint: uniform 4:3 box */
	img.height = 24;
	img.loading = "lazy";
	img.decoding = "async";
	img.dataset.name = label;
	img.src = FLAG_CDN + "/h24/" + code + ".png";
	img.srcset = FLAG_CDN + "/h48/" + code + ".png 2x";

	/* unknown flag on the CDN (bad slug, cyn, sol, …) → UN flag;
	   if even that fails → 2-char text badge */
	let untried = true;
	img.addEventListener("error", () =>
	{
		if (untried)
		{
			untried = false;
			img.src = FLAG_CDN + "/h24/un.png";
			img.srcset = FLAG_CDN + "/h48/un.png 2x";
			return;
		}
		const badge = document.createElement("span");
		badge.className = "flag-badge";
		badge.textContent = code.toUpperCase();
		badge.dataset.name = label;
		img.replaceWith(badge);
	});
	return img;
}

function renderStats(items, countries)
{
	const total = Object.keys(countries).length;
	if (!total) { return; }

	const visited = new Set();
	items.forEach((item) => item.countries.forEach((code) =>
	{
		if (countries[code]) { visited.add(code); }
	}));

	const landOf = (codes) => codes.reduce(
		(sum, code) => sum + ((countries[code] && countries[code].area) || 0), 0);
	const totalArea = landOf(Object.keys(countries));
	const pct = totalArea > 0 ? (landOf([...visited]) / totalArea) * 100 : 0;

	const stat = $("#stats");
	if (!stat) { return; }

	const num = (text) =>
	{
		const span = document.createElement("span");
		span.className = "num";
		span.textContent = text;
		return span;
	};
	stat.append(
		num(visited.size), " of ", num(total), " countries",
		document.createElement("br"),
		num(pct.toFixed(1) + "%"), " of land area");
	stat.hidden = false;
}

function renderTravels(items, countries)
{
	const root = $("#travel-log");
	if (!root) { return; }

	/* travel_log.yaml may reference a country by its yaml key or by
	   its slug — normalize to the key (they match in countries.yaml,
	   but slugs stay editable without touching the log). */
	const bySlug = {};
	Object.keys(countries).forEach((code) =>
	{
		const slug = countries[code].slug;
		if (slug && slug !== code) { bySlug[slug] = code; }
	});
	items.forEach((item) =>
	{
		item.countries = item.countries.map((ref) =>
			countries[ref] ? ref : (bySlug[ref] || ref));
	});

	items.forEach((item) =>
	{
		const year = document.createElement("div");
		year.className = "year";

		const label = document.createElement("h3");
		label.className = "year-label";
		const marker = document.createElement("span");
		marker.className = "marker";
		marker.textContent = "## ";
		marker.setAttribute("aria-hidden", "true");
		label.append(marker, decodeEntities(item.year));

		const flags = document.createElement("div");
		flags.className = "flags";
		item.countries.forEach((code) =>
		{
			const info = countries[code];
			if (!info) { console.warn("travel_log.yaml: unknown slug:", code); }
			flags.append(flagElement(code, info && info.name));
		});

		year.append(label);

		/* optional note (text: "COVID-19") — always above the flags */
		if (item.text)
		{
			const note = document.createElement("p");
			note.className = "year-text";
			note.textContent = decodeEntities(item.text);
			year.append(note);
		}

		year.append(flags);
		root.append(year);
	});

	renderStats(items, countries);
}

/* ------------------------------------------------------------ tooltip */

/* One shared div: instant styled country names on hover — native
   <title> tooltips are tiny and delayed by the browser. It lingers
   for DWELL ms after the last show, then hides itself. */
function setupTooltip()
{
	const tip = document.createElement("div");
	tip.className = "tooltip";
	tip.hidden = true;
	document.body.append(tip);

	const DWELL = 30000;
	let hideTimer = null;

	const show = (element, x, y) =>
	{
		tip.textContent = element.dataset.name || "";
		if (!tip.textContent) { tip.hidden = true; return; }
		tip.hidden = false;
		let left = x + 12;
		let top = y + 16;
		if (left + tip.offsetWidth > window.innerWidth - 8)
		{
			left = x - tip.offsetWidth - 12;
		}
		if (top + tip.offsetHeight > window.innerHeight - 8)
		{
			top = y - tip.offsetHeight - 16;
		}
		/* absolute page coords: on scroll the tooltip moves together
		   with the page instead of sticking to the screen */
		tip.style.left = (left + window.scrollX) + "px";
		tip.style.top = (top + window.scrollY) + "px";
		window.clearTimeout(hideTimer);
		hideTimer = window.setTimeout(() => { tip.hidden = true; }, DWELL);
	};

	const target = (event) => event.target.closest(".flag, .flag-badge");

	document.addEventListener("mouseover", (event) =>
	{
		const element = target(event);
		if (element) { show(element, event.clientX, event.clientY); }
	});
	document.addEventListener("mousemove", (event) =>
	{
		const element = target(event);
		if (element) { show(element, event.clientX, event.clientY); }
	});

	/* touch devices have no hover: tap a flag → show the name */
	document.addEventListener("touchstart", (event) =>
	{
		const element = target(event);
		if (!element) { return; }
		const rect = element.getBoundingClientRect();
		show(element, rect.left, rect.top);
	}, { passive: true });
}

/* --------------------------------------------------------------- load */

function fetchText(url, what)
{
	return fetch(url).then((response) =>
	{
		if (!response.ok) { throw new Error(what + " HTTP " + response.status); }
		return response.text();
	});
}

function loadTravels()
{
	Promise.all([
		fetchText("/travel_log.yaml", "travels"),
		fetchText("/assets/countries.yaml", "countries")
	])
		.then(([travelsText, countriesText]) =>
		{
			renderTravels(parseTravels(travelsText), parseCountries(countriesText));
		})
		.catch((error) =>
		{
			console.error(error);
			const root = $("#travel-log");
			if (root)
			{
				root.textContent = "The travel log could not be loaded. Try refreshing the page.";
			}
		});
}

/* -------------------------------------------------------------- init */

function init()
{
	setupContacts();
	setupTooltip();
	loadTravels();
}

if (document.readyState === "loading")
{
	document.addEventListener("DOMContentLoaded", init);
}
else
{
	init();
}
