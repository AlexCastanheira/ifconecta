document.addEventListener("DOMContentLoaded", function () {
    const toggleButton = document.getElementById("settings-toggle");
    const panel = document.getElementById("settings-panel");

    if (toggleButton && panel) {
        toggleButton.addEventListener("click", function (event) {
            event.stopPropagation();
            const isActive = panel.classList.toggle("active");
            toggleButton.setAttribute("aria-expanded", isActive ? "true" : "false");
            panel.setAttribute("aria-hidden", !isActive);
        });



        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                panel.classList.remove("active");
                toggleButton.setAttribute("aria-expanded", "false");
                panel.setAttribute("aria-hidden", "true");
            }
        });
    }
});
