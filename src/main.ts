import leaflet from "leaflet";
import luck from "./luck.ts";

import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";

const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

//Title
document.title = "Geocoin Carrier";

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Display the player's coins
let playerCoins = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No coins yet...";

// container for player coin
interface Coin {
  i: number;
  j: number;
  serial: number;
}
const playerInventory: Coin[] = [];

interface CacheCoin {
  i: number;
  j: number;
  coin: number;
}
const CacheInventory: CacheCoin[] = [];

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Get the latitude and longitude
  const cellI = i + OAKES_CLASSROOM.lat;
  const cellJ = j + OAKES_CLASSROOM.lng;
  const cacheCoin: Coin[] = [];
  // Handle interactions with the cache
  rect.bindPopup(() => {
    const coins = CacheInventory.find(
      (CacheInventory) =>
        CacheInventory.i === cellI && CacheInventory.j === cellJ,
    );
    if (coins === undefined) {
      // Each cache has a random coin value, mutable by the player
      const initialValue = Math.floor(
        luck([i, j, "initialValue"].toString()) * 5,
      );
      CacheInventory.push({ i: cellI, j: cellJ, coin: initialValue });
      for (let serial = 1; serial <= initialValue; serial++) {
        cacheCoin.push({ i: cellI, j: cellJ, serial: serial });
      }
    }
    let coinValue = CacheInventory.find(
      (CacheInventory) =>
        CacheInventory.i === cellI && CacheInventory.j === cellJ,
    )?.coin;
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
               <div>There is a cache here at "${cellI}:${cellJ}". It has <span id="value">${coinValue}</span> coin.</div>`;

    // Clicking the button decrements the cache's value and increments the player's coins
    cacheCoin.forEach((coin) => {
      const text = document.createElement("div");
      text.innerHTML = `${coin.i}:${coin.j} #${coin.serial} `;
      const button = document.createElement("button");
      button.innerHTML = "pick";
      button.addEventListener("click", () => {
        const cache_value = CacheInventory.find(
          (CacheInventory) =>
            CacheInventory.i === cellI && CacheInventory.j === cellJ,
        );
        if (cache_value && cache_value.coin > 0) {
          playerCoins++;
          playerInventory.push(coin);
          cache_value.coin -= 1;
          const index = cacheCoin.findIndex((cacheCoin: { serial: number }) =>
            cacheCoin.serial === coin.serial
          );
          cacheCoin.splice(index, 1);
        }
        popupDiv.removeChild(text);
        popupDiv.removeChild(button);
        updatePopup();
      });
      popupDiv.appendChild(text);
      popupDiv.appendChild(button);
    });

    const dropButton = document.createElement("button");
    dropButton.innerHTML = "drop";
    dropButton.addEventListener("click", () => {
      if (playerCoins > 0 && playerInventory.length > 0) {
        const cache_value = CacheInventory.find(
          (CacheInventory) =>
            CacheInventory.i === cellI && CacheInventory.j === cellJ,
        );
        const coin = playerInventory.pop()!;
        cacheCoin.push(coin);
        if (cache_value) {
          cache_value.coin++;
        }
        playerCoins--;
        popupDiv.removeChild(dropButton);
      }
      updatePopup();
    });
    popupDiv.appendChild(dropButton);

    const updatePopup = () => {
      statusPanel.innerHTML = `${playerCoins} coins accumulated`;
      const cache_value = CacheInventory.find(
        (CacheInventory) =>
          CacheInventory.i === cellI && CacheInventory.j === cellJ,
      );
      if (cache_value) {
        coinValue = cache_value.coin;
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = coinValue
          .toString();
      }
    };
    return popupDiv;
  });
}

// Look around the player's neighborhood for caches to spawn
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    // If location i,j is lucky enough, spawn a cache!
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
