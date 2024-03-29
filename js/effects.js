$("document").ready(function()
{
    ApplyMagicAntispamPill();
});

function Decrypt(message)
{
	var result = "";
	for (var i = 0;  i < message.length; i += 2)
	{
		result += (message.charAt(i));
	}
	return result;
}

function MakeMailto(email)
{
    var decoded_email = Decrypt(email);
    var html = "<a class=\"gray-link\" href=\"mailto:" + decoded_email + "\">" + decoded_email + "</a>";
	return html;
}

function MakeLink(url)
{
    var decoded_url = Decrypt(url);
    var html = "<a class=\"gray-link\" href=\"" + decoded_url + "\">" + decoded_url + "</a>";
    return html;
}

function ApplyMagicAntispamPill()
{
    $("#email span.inline-caption").html(
        MakeMailto("ttiinnnnuulliioonn@@ggmmaaiill..ccoomm"));
    $("#telega span.inline-caption").text(
        Decrypt("@@ttiinnnnuulliioonn"));
    $("#phone_etc span.inline-caption").text(
        Decrypt("++77 ((777788))  113322--5500--4444"));
    $("#phone_etc_hint span.inline-caption-hint").text(
        "For calls within Kazakhstan!");
    $("#github span.inline-caption").html(
        MakeLink("hhttttppss::////ggiitthhuubb..ccoomm//ttiinnnnuulliioonn"));
    $("#linkedout span.inline-caption").html(
        MakeLink("hhttttppss::////wwwwww..lliinnkkeeddiinn..ccoomm//iinn//iiggoorr-rryyaabbttssoovv"));

}
