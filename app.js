const $banner = document.querySelector("#homeBanner");
RebelRouter.pathChange(function(path){
    if (path !== "/") {
        $banner.style.display = "none";
    } else {
        $banner.style.display = "block";
    }
});
document.querySelector("#menuBtn").addEventListener("click", function(){
    document.querySelector("#menu").toggle();
});
