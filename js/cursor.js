document.addEventListener('DOMContentLoaded', () => {
    const cursor = document.getElementById("customCursor");
    const glow = document.getElementById("cursorGlow");
    let mouseX = 0;
    let mouseY = 0;
    document.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        document.body.style.setProperty('--mouse-x', mouseX + 'px');
        document.body.style.setProperty('--mouse-y', mouseY + 'px');
        if (cursor) {
            cursor.style.left = mouseX + "px";
            cursor.style.top = mouseY + "px";
        }
        if (glow) {
            glow.style.left = mouseX + "px";
            glow.style.top = mouseY + "px";
        }
    });
    document.addEventListener("click", () => {
        if (cursor) {
            cursor.classList.add("click");
            setTimeout(() => cursor.classList.remove("click"), 150);
        }
    });
});
