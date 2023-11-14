// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
import * as a1lib from 'alt1';
import * as BuffReader from 'alt1/buffs';
import * as sauce from './a1sauce';


// tell webpack that this file relies index.html, appconfig.json and icon.png, this makes webpack
// add these files to the output directory
// this works because in /webpack.config.js we told webpack to treat all html, json and imageimports
// as assets
import './index.html';
import './appconfig.json';
import './icon.png';
import './css/styles.css';

var debuffs = new BuffReader.default();
debuffs.debuffs = true;


function getByID(id: string) {
	return document.getElementById(id);
}

let config = {
	appName: 'deepseainsulation',
};

let helperItems = {
	Output: getByID('output'),
	settings: getByID('Settings'),
};

const alarms = {
	alarm2: './resource/alarms/alarm2.wav',
	notification1: './resource/alarms/notification1.wav',
	notification2: './resource/alarms/notification2.wav',
	notification3: './resource/alarms/notification3.wav',
	bell: './resource/alarms/bell.wav',
	elevator: './resource/alarms/elevator.wav',
	nuclear: './resource/alarms/nuclear.wav',
};

var alert: HTMLAudioElement = new Audio(alarms[sauce.getSetting('alert')]);
alert.pause();
function playAlert() {
		alert.volume = Number(sauce.getSetting('volume')) / 100;
		alert.currentTime = 0;
		alert.play();
}

function pausealert() {
	alert.volume = 0;
	alert.currentTime = 0;
	alert.pause();
}

// loads all images as raw pixel data async, images have to be saved as *.data.png
// this also takes care of metadata headers in the image that make browser load the image
// with slightly wrong colors
// this function is async, so you cant acccess the images instantly but generally takes <20ms
// use `await imgs.promise` if you want to use the images as soon as they are loaded
var debuffImages = a1lib.webpackImages({
	electrified: require('./asset/data/electrified.data.png'),
});

export function startDeepSeaInsulation() {
	if (!window.alt1) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div>You need to run this page in alt1 to capture the screen</div>`
		);
		return;
	}
	if (!alt1.permissionPixel) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Page is not installed as app or capture permission is not enabled</p></div>`
		);
		return;
	}
	if (!alt1.permissionOverlay) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Attempted to use Overlay but app overlay permission is not enabled. Please enable "Show Overlay" permission in Alt1 settinsg (wrench icon in corner).</p></div>`
		);
		return;
	}

	watchDebuffs();
}

let lastStacks = 0;
let currentStacks = 0;
function watchDebuffs() {
	if (debuffs == undefined) {
		findPlayerDebuffs();
		console.log('Debuffs bar not found - searching again in 3 seconds...')
		setTimeout(() => {}, 3000);
	} else {
		setInterval(() => {
			let debuffs = getActiveDebuffs();
			findElectrocution(debuffs);
		}, 1500);
	}
}

function findElectrocution(debuffs: BuffReader.Buff[]) {
	let foundDebuff = false;
	if (alt1.rsActive) {
		alt1.clearTooltip();
		pausealert();
	} else {
		for (let [_key, value] of Object.entries(debuffs)) {
			let electrified = value.countMatch(debuffImages.electrified, false);
			if (electrified.passed > 500) {
				foundDebuff = true;
				currentStacks = value.readTime();
			}
		}
		if (!foundDebuff) {
			currentStacks = 0;
			lastStacks = 0;
		}
		if (currentStacks && currentStacks > lastStacks && alert.paused) {
			if (sauce.getSetting('showTooltip')) {
				alt1.setTooltip(
					`You were shocked! Current Stacks: ${currentStacks}`
				);
			}
			playAlert();
		}
		lastStacks = currentStacks;
	}
}


function initSettings() {
	if (!localStorage[config.appName]) {
		setDefaultSettings();
	}

	let dropdown = <HTMLInputElement>getByID('Alert');
	dropdown.value = sauce.getSetting('alert');

	let audioFileSelectors: NodeListOf<HTMLSelectElement> =
		document.querySelectorAll('select.audio-file');
	audioFileSelectors.forEach((fileSelector) => {
		fileSelector.addEventListener('change', () => {
			sauce.updateSetting(fileSelector.dataset.setting, fileSelector.value);
		});
	});

}

function setDefaultSettings() {
	localStorage.setItem(
		config.appName,
		JSON.stringify({
			alert: 'alarm2',
			volume: 100,
		})
	);
}


let foundDebuffs = false;
function getActiveDebuffs() {
	if (foundDebuffs && sauce.getSetting('debuffsLocation')) {
		return debuffs.read();
	} else {
		findPlayerDebuffs();
	}
}

function findPlayerDebuffs() {
	if (debuffs.find()) {
		foundDebuffs = true;
		return sauce.updateSetting('debuffsLocation', [
			debuffs.pos.x,
			debuffs.pos.y,
		]);
	}
}

/* Settings */
const settingsObject = {
	settingsHeader: sauce.createHeading('h2', 'Deep Sea Insulation - v1.0.0'),
	settingDiscord: sauce.createText(
		`Please <a href="https://discord.gg/KJ2SgWyJFF" target="_blank" rel="nofollow">join the Discord</a> for any suggestions or support.`
	),
	beginGeneral: sauce.createHeading('h3', 'Alarm Settings'),
	volume: sauce.createRangeSetting('volume', 'Volume', {defaultValue: '100', min: 0, max: 100, unit: '%'}),
	tooltip: sauce.createCheckboxSetting('showTooltip', 'Enable mouse tooltip with alarm', false),
};

window.onload = function () {
	//check if we are running inside alt1 by checking if the alt1 global exists
	if (window.alt1) {
		//tell alt1 about the app
		//this makes alt1 show the add app button when running inside the embedded browser
		//also updates app settings if they are changed
		alt1.identifyAppUrl('./appconfig.json');

		let settings = document.querySelector('#Settings .container');
		Object.values(settingsObject).forEach((val) => {
			settings.before(val);
		});
		initSettings();
		getActiveDebuffs();
		startDeepSeaInsulation();
	} else {
		let addappurl = `alt1://addapp/${
			new URL('./appconfig.json', document.location.href).href
		}`;
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`
			Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1
		`
		);
	}
};
