import fetch from "node-fetch";

async function test() {
  const res = await fetch("https://www.fotmob.com/api/teams?id=10260");
  const text = await res.text();
  console.log(text.substring(0, 100));
}
test();
