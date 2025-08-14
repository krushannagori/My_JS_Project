function createToaster(config) {
  return function (str) {
    let div = document.createElement("div");
    div.textContent = str;
    div.className = `inline-block ${config.theme === "dark" ? "bg-gray-800 text-white" : "bg-gray-100 text-black"} px-6 py-3 rounded shadow-lg fixed z-50`;
    
    // Position handling
    if (config.positionY === "bottom") {
      div.style.bottom = "20px";
    } else {
      div.style.top = "20px";
    }
    
    if (config.positionX === "right") {
      div.style.right = "20px";
    } else {
      div.style.left = "20px";
    }

    document.body.appendChild(div);

    setTimeout(() => {
      document.body.removeChild(div);
    }, config.duration * 1000); // Convert seconds to milliseconds
  };
}

// Create toaster instance
let toaster = createToaster({
  positionX: "right",
  positionY: "bottom",
  theme: "light",
  duration: 3, // seconds
});

// Test the toaster
toaster("Download Done");

setTimeout(() => {
  toaster("Harsh accepted your request");
}, 2000);