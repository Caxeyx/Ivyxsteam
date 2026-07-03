import fs from "fs";

async function test() {
  const res = await fetch("https://api.football-data.org/v4/matches", {
    headers: {
      "X-Auth-Token": "6995b72b0f094d928a5e1d9a8ae957de"
    }
  });
  const data = await res.json();
  fs.writeFileSync("football_res.json", JSON.stringify(data, null, 2));
  console.log("done");
}
test();
