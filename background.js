// Background script - minimal setup since we're using popup for controls
chrome.runtime.onInstalled.addListener(() => {
	// Set default values
	chrome.storage.sync.set({
		blurThumbnails: true,
		blurPlaylists: true,
		blurVideos: true,
		blockedChannels: [],
	});
});
