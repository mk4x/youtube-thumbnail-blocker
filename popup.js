const toggleThumbnails = document.getElementById("toggleThumbnails");
const togglePlaylists = document.getElementById("togglePlaylists");
const toggleVideos = document.getElementById("toggleVideos");
const channelInput = document.getElementById("channelInput");
const addChannelBtn = document.getElementById("addChannelBtn");
const channelList = document.getElementById("channelList");

// Blur level sliders
const thumbnailBlurSlider = document.getElementById("thumbnailBlurSlider");
const playlistBlurSlider = document.getElementById("playlistBlurSlider");
const videoBlurSlider = document.getElementById("videoBlurSlider");
const thumbnailBlurValue = document.getElementById("thumbnailBlurValue");
const playlistBlurValue = document.getElementById("playlistBlurValue");
const videoBlurValue = document.getElementById("videoBlurValue");

let blockedChannels = [];

// Load current settings
chrome.storage.sync.get(
	[
		"blurThumbnails",
		"blurPlaylists",
		"blurVideos",
		"blockedChannels",
		"thumbnailBlurLevel",
		"playlistBlurLevel",
		"videoBlurLevel",
	],
	(data) => {
		toggleThumbnails.checked = data.blurThumbnails ?? true;
		togglePlaylists.checked = data.blurPlaylists ?? true;
		toggleVideos.checked = data.blurVideos ?? true;
		blockedChannels = data.blockedChannels ?? [];

		// Set blur levels
		const thumbnailLevel = data.thumbnailBlurLevel ?? 8;
		const playlistLevel = data.playlistBlurLevel ?? 8;
		const videoLevel = data.videoBlurLevel ?? 15;

		thumbnailBlurSlider.value = thumbnailLevel;
		playlistBlurSlider.value = playlistLevel;
		videoBlurSlider.value = videoLevel;

		thumbnailBlurValue.textContent = `${thumbnailLevel}px`;
		playlistBlurValue.textContent = `${playlistLevel}px`;
		videoBlurValue.textContent = `${videoLevel}px`;

		updateChannelList();
	}
);

// Update the visual channel list
function updateChannelList() {
	channelList.innerHTML = "";
	blockedChannels.forEach((channel, index) => {
		const channelItem = document.createElement("div");
		channelItem.className = "channel-item";
		channelItem.innerHTML = `
			<span>${channel}</span>
			<button class="remove-btn" data-index="${index}">Remove</button>
		`;
		channelList.appendChild(channelItem);
	});

	// add event listeners to remove buttons
	document.querySelectorAll(".remove-btn").forEach((btn) => {
		btn.addEventListener("click", (e) => {
			const index = parseInt(e.target.dataset.index);
			removeChannel(index);
		});
	});
}

// send a message to the content script to refresh blurs
function refreshBlurInTab() {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		if (tabs[0]?.id) {
			chrome.tabs.sendMessage(tabs[0].id, { action: "refreshBlur" });
		}
	});
}

// add new channel
function addChannel() {
	const channelName = channelInput.value.trim();
	if (channelName && !blockedChannels.includes(channelName)) {
		blockedChannels.push(channelName);
		chrome.storage.sync.set({ blockedChannels }, () => {
			updateChannelList();
			channelInput.value = "";
			refreshBlurInTab();
		});
	}
}

// remove channel
function removeChannel(index) {
	blockedChannels.splice(index, 1);
	chrome.storage.sync.set({ blockedChannels }, () => {
		updateChannelList();
		refreshBlurInTab();
	});
}

// handle thumbnail blur toggle
toggleThumbnails.addEventListener("change", () => {
	chrome.storage.sync.set(
		{ blurThumbnails: toggleThumbnails.checked },
		() => {
			applyChangesImmediately();
		}
	);
});

// handle playlist blur toggle
togglePlaylists.addEventListener("change", () => {
	chrome.storage.sync.set({ blurPlaylists: togglePlaylists.checked }, () => {
		applyChangesImmediately();
	});
});

// handle video blur toggle
toggleVideos.addEventListener("change", () => {
	chrome.storage.sync.set({ blurVideos: toggleVideos.checked }, () => {
		applyChangesImmediately();
	});
});

// add channel button click
addChannelBtn.addEventListener("click", addChannel);

// add channel on Enter key
channelInput.addEventListener("keypress", (e) => {
	if (e.key === "Enter") {
		addChannel();
	}
});

// handle blur level sliders
thumbnailBlurSlider.addEventListener("input", (e) => {
	const value = e.target.value;
	thumbnailBlurValue.textContent = `${value}px`;
	chrome.storage.sync.set({ thumbnailBlurLevel: parseInt(value) }, () => {
		applyChangesImmediately();
	});
});

playlistBlurSlider.addEventListener("input", (e) => {
	const value = e.target.value;
	playlistBlurValue.textContent = `${value}px`;
	chrome.storage.sync.set({ playlistBlurLevel: parseInt(value) }, () => {
		applyChangesImmediately();
	});
});

videoBlurSlider.addEventListener("input", (e) => {
	const value = e.target.value;
	videoBlurValue.textContent = `${value}px`;
	chrome.storage.sync.set({ videoBlurLevel: parseInt(value) }, () => {
		applyChangesImmediately();
	});
});

// apply changes immediately without reload
function applyChangesImmediately() {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		if (tabs[0]?.id) {
			chrome.tabs.sendMessage(tabs[0].id, { action: "refreshBlur" });
		}
	});
}
