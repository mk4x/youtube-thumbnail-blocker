function blurThumbnails() {
	document.querySelectorAll("ytd-thumbnail img").forEach((img) => {
		img.style.filter = "blur(10px)";
	});
}

blurThumbnails();

const observer = new MutationObserver(blurThumbnails);
observer.observe(document.body, { childList: true, subtree: true });
