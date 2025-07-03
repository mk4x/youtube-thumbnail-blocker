// global settings cache
let settings = {
	blurThumbnails: true,
	blurPlaylists: true,
	blurVideos: true,
	blockedChannels: [],
	thumbnailBlurLevel: 8,
	playlistBlurLevel: 8,
	videoBlurLevel: 15,
};

// inject initial CSS
function injectInitialBlurCSS() {
	const style = document.createElement("style");
	style.id = "youtube-blur-initial";
	style.textContent = `
		/* Initial blur styles - will be refined by JavaScript */
		.youtube-blur-thumbnail { filter: blur(8px) !important; }
		.youtube-blur-playlist { filter: blur(8px) !important; }
		.youtube-blur-video { filter: blur(15px) !important; }
	`;
	document.head.appendChild(style);
}

// remove initial CSS once JavaScript takes over
function removeInitialBlurCSS() {
	const style = document.getElementById("youtube-blur-initial");
	if (style) {
		style.remove();
	}
}

// load settings
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
	(res) => {
		settings.blurThumbnails = res.blurThumbnails ?? true;
		settings.blurPlaylists = res.blurPlaylists ?? true;
		settings.blurVideos = res.blurVideos ?? true;
		settings.blockedChannels = res.blockedChannels ?? [];
		settings.thumbnailBlurLevel = res.thumbnailBlurLevel ?? 8;
		settings.playlistBlurLevel = res.playlistBlurLevel ?? 8;
		settings.videoBlurLevel = res.videoBlurLevel ?? 15;

		// apply blurs immediately after loading settings
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", () => {
				removeInitialBlurCSS();
				applyBlurs();
			});
		} else {
			removeInitialBlurCSS();
			applyBlurs();
		}
	}
);

// inject initial CSS immediately
if (document.head) {
	injectInitialBlurCSS();
} else {
	document.addEventListener("DOMContentLoaded", injectInitialBlurCSS);
}

// helper function to get current channel name if on a channel page
function getCurrentChannelName() {
	const isChannelPage =
		window.location.pathname.includes("/channel/") ||
		window.location.pathname.includes("/@") ||
		window.location.pathname.includes("/c/") ||
		window.location.pathname.includes("/user/");

	if (!isChannelPage) return null;

	// Try multiple selectors for channel name
	const selectors = [
		"ytd-channel-name #text",
		".ytd-channel-name #text",
		"#channel-name .style-scope.ytd-channel-name",
		'yt-formatted-string[id="text"].style-scope.ytd-channel-name',
		"ytd-c4-tabbed-header-renderer ytd-channel-name #text",
		"#channel-header-container ytd-channel-name #text",
		"#channel-header ytd-channel-name #text",
	];

	for (const selector of selectors) {
		const element = document.querySelector(selector);
		if (element && element.textContent.trim()) {
			return element.textContent.trim();
		}
	}

	// fallback, try to get channel name from document title
	const pageTitle = document.title;
	if (pageTitle && pageTitle.includes(" - YouTube")) {
		return pageTitle.replace(" - YouTube", "").trim();
	}

	return null;
}

// blur thumbnails only from specified channels
function blurThumbnails(blurEnabled, blockedChannels, blurLevel = 8) {
	const allSelectors = [
		"#thumbnail",
		"ytd-thumbnail img",
		".ytd-thumbnail img",
		"ytd-playlist-thumbnail #thumbnail",
		".yt-lockup-view-model-wiz img",
		"ytd-shorts-lockup-view-model img",
		"ytd-reel-item-renderer img",
		".yt-shorts-thumbnail img",
		"[id*='thumbnail'] img",
	];

	if (!blurEnabled) {
		// Remove blur from all thumbnails
		allSelectors.forEach((selector) => {
			document.querySelectorAll(selector).forEach((element) => {
				element.style.filter = "none";
			});
		});
		return;
	}

	// check if we're on a channel page and if its a blocked channel
	const currentChannelName = getCurrentChannelName();
	let currentChannelBlocked = false;

	if (currentChannelName) {
		currentChannelBlocked =
			blockedChannels &&
			blockedChannels.some((channel) =>
				currentChannelName.toLowerCase().includes(channel.toLowerCase())
			);

		// if we're on a blocked channel page, blur all thumbnails
		if (currentChannelBlocked) {
			allSelectors.forEach((selector) => {
				document.querySelectorAll(selector).forEach((element) => {
					element.style.filter = `blur(${blurLevel}px)`;
				});
			});
			return;
		}
	}

	// apply blur only to thumbnails from blocked channels for regular videos
	allSelectors.forEach((selector) => {
		document.querySelectorAll(selector).forEach((element) => {
			// Find the closest video container
			const videoContainer = element.closest(
				"ytd-compact-video-renderer, ytd-video-renderer, ytd-rich-item-renderer, ytd-playlist-video-renderer, ytd-shorts-lockup-view-model, ytd-reel-item-renderer, .yt-lockup-view-model-wiz, ytd-playlist-panel-video-renderer, ytd-grid-video-renderer"
			);

			if (videoContainer) {
				// look for channel name within this container
				let channelName = videoContainer.querySelector(
					"ytd-channel-name #text, #channel-name #text, .ytd-channel-name #text"
				);

				// special handling for playlist panel items
				if (
					!channelName &&
					videoContainer.matches("ytd-playlist-panel-video-renderer")
				) {
					channelName = videoContainer.querySelector("#byline");
				}

				// for grid video renderers (on channel pages), the channel info might be missing
				// in that case, we already handled it above with the channel page check
				if (channelName) {
					const channelText = channelName.textContent.trim();
					const shouldBlur =
						blockedChannels &&
						blockedChannels.some((channel) =>
							channelText
								.toLowerCase()
								.includes(channel.toLowerCase())
						);

					if (shouldBlur) {
						element.style.filter = `blur(${blurLevel}px)`;
					} else {
						element.style.filter = "none";
					}
				} else if (
					videoContainer.matches("ytd-grid-video-renderer") &&
					!currentChannelName
				) {
					// for grid renderers not on channel pages, try to get channel from URL if available
					const videoLink =
						videoContainer.querySelector('a[href*="/watch"]');
					if (videoLink) {
						// we cant easily get channel info from just the video link, so skip blurring
						// this mainly applies to situations where grid renderers appear outside channel pages
						element.style.filter = "none";
					}
				}
			}
		});
	});
}

// blur all playlist thumbnails (simple toggle)
function blurPlaylists(blurEnabled, blurLevel = 8) {
	const playlistSelectors = [
		"yt-thumbnail-view-model img",
		".yt-thumbnail-view-model img",
		".yt-collection-thumbnail-view-model img",
	];

	playlistSelectors.forEach((selector) => {
		document.querySelectorAll(selector).forEach((element) => {
			element.style.filter = blurEnabled
				? `blur(${blurLevel}px)`
				: "none";
		});
	});
}

// blur video player if channel is in blocked list
function blurVideo(blurEnabled, blockedChannels, blurLevel = 15) {
	const video = document.querySelector(".html5-video-container video");

	if (!video) return;

	if (!blurEnabled || !blockedChannels || blockedChannels.length === 0) {
		video.style.filter = "none";
		return;
	}

	// check channel name in watch metadata
	const channelName = document.querySelector(
		"ytd-video-owner-renderer ytd-channel-name #text, ytd-watch-metadata ytd-channel-name #text, #text.ytd-channel-name"
	);

	if (channelName) {
		const channelText = channelName.textContent.trim();
		const shouldBlur = blockedChannels.some((channel) =>
			channelText.toLowerCase().includes(channel.toLowerCase())
		);

		if (shouldBlur) {
			video.style.filter = `blur(${blurLevel}px)`;
		} else {
			video.style.filter = "none";
		}
	}
}

// main control function using cached settings
function applyBlurs() {
	blurThumbnails(
		settings.blurThumbnails,
		settings.blockedChannels,
		settings.thumbnailBlurLevel
	);
	blurPlaylists(settings.blurPlaylists, settings.playlistBlurLevel);
	blurVideo(
		settings.blurVideos,
		settings.blockedChannels,
		settings.videoBlurLevel
	);
}

// debounced version to prevent excessive calls
let applyBlursTimeout;
function debouncedApplyBlurs() {
	clearTimeout(applyBlursTimeout);
	applyBlursTimeout = setTimeout(applyBlurs, 100);
}

// update settings when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
	if (namespace === "sync") {
		if (changes.blurThumbnails)
			settings.blurThumbnails = changes.blurThumbnails.newValue;
		if (changes.blurPlaylists)
			settings.blurPlaylists = changes.blurPlaylists.newValue;
		if (changes.blurVideos)
			settings.blurVideos = changes.blurVideos.newValue;
		if (changes.blockedChannels)
			settings.blockedChannels = changes.blockedChannels.newValue;
		if (changes.thumbnailBlurLevel)
			settings.thumbnailBlurLevel = changes.thumbnailBlurLevel.newValue;
		if (changes.playlistBlurLevel)
			settings.playlistBlurLevel = changes.playlistBlurLevel.newValue;
		if (changes.videoBlurLevel)
			settings.videoBlurLevel = changes.videoBlurLevel.newValue;
		debouncedApplyBlurs();
	}
});

// watch DOM for new elements with throttling (only start after initial load)
document.addEventListener("DOMContentLoaded", () => {
	const observer = new MutationObserver(debouncedApplyBlurs);
	observer.observe(document.body, {
		childList: true,
		subtree: true,
		attributes: false,
		attributeOldValue: false,
		characterData: false,
	});
});
