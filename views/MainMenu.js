"use strict";
var px = require("../px");
var etg = require("../etg");
var gfx = require("../gfx");
var ui = require("../uiutil");
var chat = require("../chat");
var sock = require("../sock");
var mkAi = require("../mkAi");
var Cards = require("../Cards");
var etgutil = require("../etgutil");
var options = require("../options");
var userutil = require("../userutil");
module.exports = function(nymph) {
	var popdom, stage = {endnext: function(){
		setDom(null);
		document.removeEventListener("mousemove", resetTip);
	}};
	function setDom(dom){
		if (oracle) oracle.visible = false;
		if (popdom) document.body.removeChild(popdom);
		if (popdom = dom) document.body.appendChild(dom);
	}
	function mkSetTip(text){
		return function(){
			tinfo.text = text;
		}
	}
	var aicostpay = [
		[0, 15],
		[5, 30],
		[10, 70],
		[20, 200],
		[userutil.arenaCost(0), 60],
		[userutil.arenaCost(1), 120],
	];
	function costText(lv, nonewline){
		return !sock.user ? "" : (nonewline ? "" : "\n") + "Cost: " + aicostpay[lv][0] + "$. Base reward: " + aicostpay[lv][1] + "$";
	}
	var tipjar = [
		"Each card in your booster pack has a 50% chance of being from the chosen element",
		"Your arena deck will earn you 3$ per win & 1$ per loss",
		"Colosseum lets you compete in a number of daily events for extra prizes. The colosseum challenges reset daily",
		"Be sure to try the Proving Grounds Quests for some good cards",
		"Be sure to keep track of the rarity icons; Grey means Common, Green means Uncommon, Blue means Rare, Orange means Shard, & Pink means Ultra Rare",
		"The Library button allows you to see all of a user's tradeable cards",
		"If you are a new user, be sure to get the free Bronze & Silver packs from the Shop",
		"Starter decks, cards from free packs, & all non-Common Daily Cards are account-bound; they cannot be traded or sold",
		"If you include account-bound cards in an upgrade, the upgrade will also be account-bound",
		"You'll receive a Daily Card upon logging in after midnight GMT0. If you submit an Arena deck, the deck will always contain 5 copies of that card",
		"Unupgraded pillars & pendulums are free",
		"Cards sell for around half as much as they cost to buy from a pack",
		"Quests are free to try, & you always face the same deck. Keep trying until you collect your reward",
		"You may mulligan at the start of the game to shuffle & redraw your hand with one less card",
		"Your account name is case sensitive",
		"Arena Tier 1 is unupgraded, while Tier 2 is upgraded. All decks in a tier have the same number of attribute points",
		"If you type '/who' in chat you will get a list of the users who are online. '/w username message' will send your message only to one user",
		"Chat commands: /who, /mute, /unmute, /clear, /w, /decks",
		"Keyboard shortcuts: space ends turn, backspace cancels, w targets opponent, s targets yourself, 1 through 8 cast cards in hand",
		"The first text bar under the game is the import/export bar & shows your current deck. The bar below it shows game messages & sometimes the opponent's deck",
		"The AI Deck input may be used to fight any deck of your choice, but only in sandbox mode",
		"Remember that you may use the logout button to enter sandbox mode to review the card pool, check rarities & try out new decks",
		"Commoner & Champion have random decks, while Mage & Demigod have premade decks. Commoner & Mage are unupped, Champion has some upped, & Demigod is fully upped",
		"Decks submitted to arena lose hp exponentially per day, down to a minimum of a quarter of their original hp",
		"If you don't get what you want from the packs in the shop, ask to trade in chat or the openEtG forum",
		"Rarity doesn't necessarily relate to card strength. You can go a long ways with commons & uncommons",
		"A ply is half a turn",
		"Mark cards are only obtainable through PvP events. A tournament deck verifier is at tournament.htm",
		"After an AI battle you will win a random common, uncommon, or rare from your opponent's deck",
		"Cards in packs have a (45/packsize)% chance to increment rarity",
		"At Wealth T50 you can see which players have the highest wealth. Wealth is a combination of current gold & one's cardpool"
	];
	var tipNumber = etg.PlayerRng.upto(tipjar.length);

	function resetTip(event) {
		if (event.target.tagName == "CANVAS" || event.target.tagName == "HTML") tinfo.text = sock.user ? tipjar[tipNumber] + "." : "To register, just type desired username & password in the fields to the right, then click 'Login'.";
	}
	var tinfo = px.domText(""), tstats = px.domText(sock.user ? sock.user.gold + "$ " + sock.user.name + "\nPvE " + sock.user.aiwins + " - " + sock.user.ailosses + "\nPvP " + sock.user.pvpwins + " - " + sock.user.pvplosses : "Sandbox");
	tinfo.style.maxWidth = "800px";

	function wealthTop(){
		sock.emit("wealthtop");
		this.style.display = "none";
	}
	function titleText(text, middle) {
		var text = px.domText(text);
		text.style.fontSize = "20px";
		text.style.color = "white";
		text.style.textAlign = "center";
		text.style.verticalAlign = "middle";
		text.style.width = middle ? "300px" : "250px";
		//text.style.height = "80px";
		text.style.pointerEvents = "none";
		return text;
	}
	function tierText(text) {
		var text = px.domText(text);
		text.style.fontSize = "18px";
		text.style.color = "white";
		text.style.verticalAlign = "middle";
		//text.style.height = "80px";
		text.style.pointerEvents = "none";
		return text;
	}
	function labelText(text) {
		var text = px.domText(text);
		text.style.fontSize = "14px";
		text.style.color = "white";
		text.style.verticalAlign = "middle";
		text.style.height = "20px";
		text.style.pointerEvents = "none";
		return text;
	}
	var dom = [
		[40, 16, px.domBox(820, 60)],
		[40, 92, px.domBox(250, 120)],
		[40, 210, px.domBox(250, 120)],
		[300, 92, px.domBox(300, 320)],
		[300, 420, px.domBox(300, 170)],
		[610, 92, px.domBox(250, 200)],
		[610, 300, px.domBox(250, 200)],
		[610, 510, px.domBox(250, 80)],
		[300, 102, titleText("AI BATTLE",true)],
		[610, 102, titleText("CARDS AND DECKS")],
		[40, 220, titleText("LEADERBOARDS")],
		[300, 430, titleText("ARENA"),true],
		[610, 310, titleText("PLAYERS")],
		[40, 102, titleText("STATS")],
		[359, 460, tierText("Tier 1")],
		[450, 460, tierText("Tier 2")],
		[410, 140, labelText(costText(1,true))],
		[410, 170, labelText(costText(2, true))],
		[410, 200, labelText(costText(3, true))],
		[410, 230, labelText(costText(4, true))],
		[330, 310, labelText("Daily Challenges!")],
		[460, 310, labelText("Go on adventure!")],
		[50, 26, tinfo],
		[80, 140, tstats],
		[320, 140, ["Commoner", mkAi.mkAi(0), mkSetTip("Commoners have no upgraded cards & mostly common cards." + costText(0))]],
		[320, 170, ["Mage", mkAi.mkPremade("mage"), mkSetTip("Mages have preconstructed decks with a couple rares." + costText(1))]],
		[320, 200, ["Champion", mkAi.mkAi(2), mkSetTip("Champions have some upgraded cards." + costText(2))]],
		[320, 230, ["Demigod", mkAi.mkPremade("demigod"), mkSetTip("Demigods are extremely powerful. Come prepared for anything." + costText(3))]],
		[700, 220, ["Deck", require("./Editor"), mkSetTip("Edit & manage your decks.")]],
		[130, 260, ["Wealth T50", wealthTop, mkSetTip("See who's collected the most wealth.")]],
		[777, 50, ["Next tip", function() {
			tipNumber = (tipNumber+1) % tipjar.length;
			tinfo.text = tipjar[tipNumber] + ".";
		}]]
	];
	stage.menudom = dom;
	for (var i=0; i<2; i++){
		(function(lvi){
			function arenaAi() {
				if (etgutil.decklength(sock.getDeck()) < 31) {
					require("./Editor")();
					return;
				}
				var cost = userutil.arenaCost(lvi.lv);
				if (sock.user.gold < cost) {
					chat("Requires " + cost + "$");
					return;
				}
				sock.userEmit("foearena", lvi);
				this.style.display = "none";
			}
			function arenaInfo() {
				sock.userEmit("arenainfo", lvi);
				this.style.display = "none";
			}
			function arenaTop() {
				sock.emit("arenatop", lvi);
				this.style.display = "none";
			}
			var x = 350+i*100;
			if (sock.user){
				dom.push(
					[x, 490, ["Arena AI", arenaAi, mkSetTip("In the arena you will face decks from other players." + costText(4+lvi.lv))]],
					[x, 540, ["Arena Info", arenaInfo, mkSetTip("Check how your arena deck is doing.")]]
				);
			}
			dom.push(
				[80+i*100, 290, ["Arena" + (i+1) + " T20", arenaTop, mkSetTip("See who the top players in arena are right now.")]]
			);
		})({lv:i});
	}

	if ((sock.user && sock.user.oracle) || typeof nymph === "string") {
		var oracle = new PIXI.Sprite(gfx.getArt(nymph || sock.user.oracle));
		oracle.position.set(92, 340);
		stage.view = oracle;
		delete sock.user.oracle;
	}
	document.addEventListener("mousemove", resetTip);

	function logout(cmd) {
		if (sock.user){
			sock.userEmit(cmd);
			sock.user = undefined;
			options.remember = false;
			if (typeof localStorage !== "undefined") delete localStorage.remember;
		}
		require("./Login")();
	}
	stage.cmds = {
		pvpgive: require("./Match"),
		tradegive: require("./Trade"),
		librarygive: require("./Library"),
		arenainfo: require("./ArenaInfo"),
		arenatop: require("./ArenaTop"),
		wealthtop: require("./WealthTop"),
		codecard:function(data){
			require("./Reward")(data.type, data.num, foename.value);
		},
		codegold:function(data) {
			sock.user.gold += data.g;
			chat.addSpan(px.domText(data.g + "$ added!\n"));
		},
		codecode:function(data) {
			sock.user.pool = etgutil.addcard(sock.user.pool, data.card);
			chat(Cards.Codes[data.card].name + " added!");
		},
		challenge:function(data) {
			var span = document.createElement("span");
			span.style.cursor = "pointer";
			span.style.color = "blue";
			span.addEventListener("click", (data.pvp ? challengeClick : tradeClick).bind(null, data.f));
			span.appendChild(document.createTextNode(data.f + (data.pvp ? " challenges you to a duel!" : " wants to trade with you!")));
			chat.addSpan(span);
			sock.emit("challrecv", {f: data.f, pvp: data.pvp});
		},
	};
	function challengeClick(foe) {
		var deck = sock.getDeck();
		if (etgutil.decklength(deck) < (sock.user ? 31 : 11)){
			require("./Editor")();
			return;
		}
		var gameData = {};
		ui.parsepvpstats(gameData);
		if (sock.user) {
			gameData.f = typeof foe === "string" ? foe : foename.value;
			sock.userEmit("foewant", gameData);
		}else{
			gameData.deck = deck;
			gameData.room = foename.value;
			sock.emit("pvpwant", gameData);
		}
	}
	function maybeChallenge(e) {
		e.cancelBubble = true;
		if (e.keyCode != 13) return;
		if (foename.value) {
			challengeClick();
		}
	}
	function tradeClick(foe) {
		sock.userEmit("tradewant", { f: typeof foe === "string" ? foe : foename.value });
	}
	function rewardClick() {
		sock.userEmit("codesubmit", { code: foename.value });
	}
	function libraryClick() {
		var name = foename.value;
		if (!name && sock.user) name = sock.user.name;
		if (name) sock.emit("librarywant", { f: name });
	}
	function soundChange() {
		ui.changeSound(options.enableSound);
	}
	function musicChange() {
		ui.changeMusic(options.enableMusic);
	}
	function hideRightpaneChange(){
		document.getElementById("rightpane").style.display = options.hideRightpane ? "none" : "inline";
		sock.emit("chatus", {hide: !!options.offline || !!options.hideRightpane});
	}
	function makeCheck(text, change, opt, nopersist){
		var lbl = document.createElement("label"), box = document.createElement("input");
		box.type = "checkbox";
		if (opt) options.register(opt, box, nopersist);
		if (change) box.addEventListener("change", change);
		lbl.appendChild(box);
		lbl.appendChild(document.createTextNode(text));
		return lbl;
	}
	function makeInput(placeholder, keydown){
		var input = document.createElement("input");
		input.placeholder = placeholder;
		if (keydown) input.addEventListener("keydown", keydown);
		else input.className = "numput";
		return input;
	}
	var foename = makeInput("Challenge/Trade", maybeChallenge), pvphp = makeInput("HP"), pvpmark = makeInput("Mark"), pvpdraw = makeInput("Draw"), pvpdeck = makeInput("Deck");
	var aideck = makeInput("AI Deck", maybeCustomAi), aihp = makeInput("HP"), aimark = makeInput("Mark"), aidraw = makeInput("Draw"), aideckpower = makeInput("Deck");
	aideck.addEventListener("click", function(){this.setSelectionRange(0, 999)}),
	options.register("foename", foename, true);
	options.register("pvphp", pvphp, true);
	options.register("pvpmark", pvpmark, true);
	options.register("pvpdraw", pvpdraw, true);
	options.register("pvpdeck", pvpdeck, true);
	options.register("aideck", aideck, true);
	options.register("aihp", aihp, true);
	options.register("aimark", aimark, true);
	options.register("aidraw", aidraw, true);
	options.register("aideckpower", aideckpower, true);
	function maybeCustomAi(e){
		if (e.keyCode == 13) aiClick.call(this);
	}
	function aiClick() {
		if (!options.aideck) return;
		this.blur();
		var deck = sock.getDeck();
		if (etgutil.decklength(deck) < 11 || etgutil.decklength(options.aideck) < 11) {
			require("./Editor")();
			return;
		}
		var gameData = { deck: options.aideck, urdeck: deck, seed: Math.random() * etgutil.MAX_INT, foename: "Custom", cardreward: "" };
		ui.parsepvpstats(gameData);
		ui.parseaistats(gameData);
		require("./Match")(gameData, true);
	}
	soundChange();
	musicChange();
	dom.push(
		[305, 360, aideck],
		[455, 360, aihp],
		[490, 360, aimark],
		[525, 360, aidraw],
		[560, 360, aideckpower],
		[400, 385, ["Custom", aiClick]],
		[630, 350, foename],
		[630, 400, pvphp],
		[630, 425, pvpmark],
		[630, 450, pvpdraw],
		[630, 475, pvpdeck],
		[630, 375, ["PvP", challengeClick]],
		[720, 375, ["Trade", tradeClick]],
		[720, 400, ["Library", libraryClick]],
		[720, 475, ["Reward", rewardClick]],
		[777, 550, ["Logout", logout.bind(null, "logout"), mkSetTip("Click here to log out.")]]
	);
	if (sock.user){
		dom.push(
			[460, 280, ["Quests", require("./QuestMain"), mkSetTip("Go on an adventure!")]],
			[350, 280, ["Colosseum", require("./Colosseum"), mkSetTip("Try some daily challenges in the Colosseum!")]],
			[650, 260, ["Shop", require("./Shop"), mkSetTip("Buy booster packs which contain cards from the elements you choose.")]],
			[750, 260, ["Upgrade", require("./Upgrade"), mkSetTip("Upgrade or sell cards.")]],
			[660, 140, labelText("DECK: " + sock.user.selectedDeck)],
			[637, 550, ["Settings", function() {
				if (popdom && popdom.id == "settingspane"){
					setDom(null);
					return;
				}
				var div = px.domBox(392, 156);
				div.style.pointerEvents = "auto";
				div.style.position = "absolute";
				div.style.left = "460px";
				div.style.top = "380px";
				var wipe = px.domButton("Wipe Account",
					function() {
						if (foename.value == sock.user.name + "yesdelete") {
							logout("delete");
						} else {
							chat("Input '" + sock.user.name + "yesdelete' into Challenge to delete your account");
						}
					},
					mkSetTip("Click here to permanently remove your account.")
				);
				function changeFunc(){
					if (this.value == "Change Pass") this.value = "Confirm";
					else {
						this.value = "Change Pass";
						sock.userEmit("passchange", { p: changePass.value });
					}
				}
				var changePass = document.createElement("input"), changeBtn = px.domButton("Change Pass", changeFunc),
					enableSound = makeCheck("Enable sound", soundChange, "enableSound"),
					enableMusic = makeCheck("Enable music", musicChange, "enableMusic"),
					preloadart = makeCheck("Preload art", null, "preart"),
					hideRightpane = makeCheck("Hide rightpane", hideRightpaneChange, "hideRightpane"),
					printstats = makeCheck("Print stats", null, "stats"),
					hideCostIcon = makeCheck("Hide cost icon", gfx.refreshCaches, "hideCostIcon"),
					disableTut = makeCheck("Disable tutorial", null, "disableTut");
				changePass.type = "password";
				changePass.addEventListener("keydown", function(e){
					if (e.keyCode == 13) changeFunc();
				});
				[[8, 8, changePass], [162, 8, changeBtn],
					[8, 53, enableSound], [135, 53, enableMusic], [260, 53, preloadart],
					[8, 88, hideRightpane], [135, 88, printstats], [260, 88, hideCostIcon],
					[8, 123, disableTut],
					[309, 123, wipe]].forEach(function(info) {
					info[2].style.position = "absolute";
					info[2].style.left = info[0] + "px";
					info[2].style.top = info[1] + "px";
					div.appendChild(info[2]);
				});
				div.id = "settingspane";
				setDom(div);
			}]]
		);
	}
	resetTip({target:{tagName:"HTML"}});
	px.view(stage);
}