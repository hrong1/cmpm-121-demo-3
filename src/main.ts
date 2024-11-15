import leaflet from "leaflet";
import luck from "./luck.ts";

import "leaflet/dist/leaflet.css";
import "./style.css";
import "./leafletWorkaround.ts";
import { Board } from "./board.ts";

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
let playerInventory: Coin[] = [];

interface CacheCoin {
  i: number;
  j: number;
  coin: number;
}
let CacheInventory: CacheCoin[] = [];

function updateCoin(i, j, newCoins) {
  const CacheIndex = CacheInventory.findIndex(
    (CacheInventory) => CacheInventory.i === i,
    (CacheInventory) => CacheInventory.j === j,
  );
  if (CacheIndex !== -1) {
    CacheInventory[CacheIndex].coin = newCoins;
  }
}

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

  // Handle interactions with the cache
  rect.bindPopup(() => {
    const coins = CacheInventory.find(
      (CacheInventory) => CacheInventory.i === cellI,
      (CacheInventory) => CacheInventory.j === cellJ,
    );
    if (coins === undefined) {
      // Each cache has a random coin value, mutable by the player
      let initialValue = Math.floor(
        luck([i, j, "initialValue"].toString()) * 5,
      );
      CacheInventory.push({ i: cellI, j: cellJ, coin: initialValue });
      for (let serial = 0; serial < initialValue; serial++) {
        playerInventory.push({ i: cellI, j: cellJ, serial: serial });
      }
    }
    let coinValue = CacheInventory.find(
      (CacheInventory) => CacheInventory.i === cellI,
      (CacheInventory) => CacheInventory.j === cellJ,
    )?.coin;
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${cellI},${cellJ}". It has coin <span id="value">${coinValue}</span>.</div>
                <button id="pick">pick</button>
                <button id="drop">drop</button>`;

    // Clicking the button decrements the cache's value and increments the player's coins
    popupDiv
      .querySelector<HTMLButtonElement>("#pick")!
      .addEventListener("click", () => {
        if (coinValue && coinValue > 0) {
          coinValue--;
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            coinValue.toString();
          playerCoins++;
          updateCoin(cellI, cellJ, coinValue);
          statusPanel.innerHTML = `${playerCoins} coins accumulated`;
        }
      });
    popupDiv
      .querySelector<HTMLButtonElement>("#drop")!
      .addEventListener("click", () => {
        if (playerCoins > 0 && coinValue !== undefined) {
          coinValue++;
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            coinValue.toString();
          playerCoins--;
          updateCoin(cellI, cellJ, coinValue);
          statusPanel.innerHTML = `${playerCoins} coins accumulated`;
        }
      });
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
