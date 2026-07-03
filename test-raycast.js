import fetch from "node-fetch";

async function test() {
  const res = await fetch("https://www.fotmob.com/api/teams?id=47");
  const text = await res.text();
  console.log(text.substring(0, 200));
}
test();
