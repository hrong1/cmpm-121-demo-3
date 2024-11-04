// todo
import "./style.css";
 
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = "Demo 3";
const header = document.createElement("h1");
header.innerHTML = "Demo 3";
app.append(header);

const button = document.createElement("button");
button.innerHTML = "Click Me";
app.append(button);

button.addEventListener("click", () => {
    alert("You just clicked the button!");
});