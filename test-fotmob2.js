import Fotmob from "fotmob";
const fotmob = new Fotmob.default();

async function test() {
  const matches = await fotmob.getMatchesByDate("20240420");
  console.log(matches.leagues ? matches.leagues.length : "no leagues");
}
test().catch(console.error);
