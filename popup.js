const toggleThumbnails = document.getElementById("toggleThumbnails");
const togglePlaylists = document.getElementById("togglePlaylists");
const toggleVideos = document.getElementById("toggleVideos");
const channelInput = document.getElementById("channelInput");
const addChannelBtn = document.getElementById("addChannelBtn");
const channelList = document.getElementById("channelList");

let blockedChannels = [];

// load current settings
chrome.storage.sync.get(
	["blurThumbnails", "blurPlaylists", "blurVideos", "blockedChannels"],
	(data) => {
		toggleThumbnails.checked = data.blurThumbnails ?? true;
		togglePlaylists.checked = data.blurPlaylists ?? true;
		toggleVideos.checked = data.blurVideos ?? true;
		blockedChannels = data.blockedChannels ?? [];
		updateChannelList();
	}
);

// update the visual channel list
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

// add new channel
function addChannel() {
	const channelName = channelInput.value.trim();
	if (channelName && !blockedChannels.includes(channelName)) {
		blockedChannels.push(channelName);
		chrome.storage.sync.set({ blockedChannels }, () => {
			updateChannelList();
			channelInput.value = "";
			reloadCurrentTab();
		});
	}
}

// remove channel
function removeChannel(index) {
	blockedChannels.splice(index, 1);
	chrome.storage.sync.set({ blockedChannels }, () => {
		updateChannelList();
		reloadCurrentTab();
	});
}

// reload current tab to apply changes
function reloadCurrentTab() {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		chrome.tabs.reload(tabs[0].id);
	});
}

// handle thumbnail blur toggle
toggleThumbnails.addEventListener("change", () => {
	chrome.storage.sync.set(
		{ blurThumbnails: toggleThumbnails.checked },
		() => {
			reloadCurrentTab();
		}
	);
});

// handle playlist blur toggle
togglePlaylists.addEventListener("change", () => {
	chrome.storage.sync.set({ blurPlaylists: togglePlaylists.checked }, () => {
		reloadCurrentTab();
	});
});

// handle video blur toggle
toggleVideos.addEventListener("change", () => {
	chrome.storage.sync.set({ blurVideos: toggleVideos.checked }, () => {
		// apply changes immediately without reload
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			chrome.scripting.executeScript({
				target: { tabId: tabs[0].id },
				func: () => {
					// rerun the blur function
					if (typeof applyBlurs === "function") {
						applyBlurs();
					}
				},
			});
		});
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
