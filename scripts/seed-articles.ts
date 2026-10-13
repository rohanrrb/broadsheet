/**
 * Sample writings for the local dev instance, newest first.
 * In `paragraphs`, a line starting with "## " becomes a heading and one
 * starting with "> " a blockquote. `image` is a picsum.photos seed.
 */
export interface SeedArticle {
  title: string;
  author: string;
  image?: string;
  /** Photo caption, stored as the image's alt text. */
  caption?: string;
  paragraphs: string[];
}

export const SEED_ARTICLES: SeedArticle[] = [
  {
    title: "The Last Ferry to Nowhere: A River Town Learns to Wait",
    author: "parsley-clay",
    image: "ferry-river",
    caption: "The ferry landing at Harlow, idle since the county ended service this spring.",
    paragraphs: [
      "For a hundred and twelve years the ferry at Harlow Landing ran every forty minutes, dawn to dusk, carrying farmers, schoolchildren, and the occasional lost tourist across a quarter mile of brown water. This spring it stopped. The county says the hull is too thin to patch again; the town says the county has been looking for an excuse since the bridge opened upstream in 1987.",
      "What nobody expected was how quiet it would be. The horn, a flat two-note bleat that residents claim they stopped hearing decades ago, turns out to have been the town's clock. Without it, people report arriving late to church, forgetting to take bread out of the oven, missing the moment the light turns gold on the water.",
      "“You don't know you're keeping time with something until it's gone,” said Ruth Bayliss, who has run the bait shop at the landing since her husband died. She still opens at six. The early customers still come, but now they stand at the end of the ramp and look across, as if the boat might appear out of habit.",
      "## An economy measured in crossings",
      "The numbers are small but they matter here. The ferry carried roughly nine hundred people a week at its peak and about three hundred in its final year. The diner on the far bank did a third of its business with passengers waiting for the return trip. The owner has cut her hours to four days. The feed store has started delivering, which it never had to do before, and has hired a second driver to manage it.",
      "The bridge is eleven miles upstream. For a farmer with a trailer, that is forty minutes each way on a two-lane road that floods twice a year. For a teenager without a car, it may as well be the moon. The school district has added a bus route; the ride is now an hour and ten minutes.",
      "> “The river used to be the road. Now it's the wall.”",
      "There is a proposal, drafted by a retired engineer and circulated on paper at the post office, to buy a used ferry from a state park on the coast and run it as a cooperative. It would cost about as much as a nice house. Nobody knows whether the town has that kind of money, or that kind of patience, but the meetings are full, and people keep bringing pie.",
      "On the last evening of service, the captain, Del Arroyo, let the engine idle mid-river for a full minute before bringing her in. He did not make a speech. He blew the horn twice, as he always had, and then, after a pause long enough that people on the bank started to turn away, a third time.",
    ],
  },
  {
    title: "The Volcano Next Door Is Not Asleep, Only Patient",
    author: "magma",
    image: "magma-crater",
    caption: "Steam rising from the summit vents at first light.",
    paragraphs: [
      "People who live under a volcano develop a private vocabulary for it. Here it is “the hill”, as in the hill is smoking again, or the hill kept me up. Nobody says eruption. The word is considered bad manners, like naming an illness at dinner.",
      "The observatory on the north flank has eleven staff and one very old dog. They measure the mountain the way a nurse measures a sleeping patient: breath, temperature, the small twitches. Most days the instruments draw flat lines and the staff play cards.",
      "## What the instruments cannot say",
      "A seismograph will tell you that rock is moving three miles down. It will not tell you whether to plant the lower field this year. For that, people ask Tavita, who is ninety and remembers the last time, and who mostly answers by looking at the birds.",
      "The last time was sixty-one years ago. The lava took the school, the cannery and a road, and nobody died, which the town credits to a priest who rang the bell for nine hours and the government credits to a telegram.",
      "Since then the town has grown back over the flow. The new school sits on black rock that still warms the classrooms in winter. The children think this is normal. They are, in a sense, right.",
      "Asked whether she worries, the observatory's director said that worry is not a measurement. Then she checked the tiltmeter again, which had not changed, and went back to her cards.",
    ],
  },
  {
    title: "Why Every Kitchen Should Own One Very Bad Knife",
    author: "umber-lantern",
    paragraphs: [
      "It lives in the drawer with the twist ties. It came free with a set of steak knives in 2009. It will never hold an edge, and that is exactly why it is the most-used blade in my house: nobody is afraid to open a package with it, pry a lid, or hack at a frozen block of stock.",
      "Good tools invite care. A bad tool invites use. A kitchen needs both.",
    ],
  },
  {
    title: "The Quiet Revolution in Municipal Libraries",
    author: "garden-slate",
    image: "library-stacks",
    caption: "The central branch, where the stacks now share space with a seed exchange and a tool shelf.",
    paragraphs: [
      "Walk into the central branch of almost any mid-sized city library this year and you will find, in addition to books, a seed exchange, a tool lending shelf, a recording booth, and at least one person asleep in an armchair who is not being asked to leave. The shift has been gradual enough to go unnoticed and broad enough to amount to a redefinition of what a library is for.",
      "Librarians describe it less as reinvention than as listening. When patrons kept asking where to borrow a drill, they started lending drills. When the nearest public bathroom closed, they became the nearest public bathroom. The mission, several of them told me, has always been access; the objects have simply changed.",
      "The strain shows at the edges. Staffing has not kept pace, and front-desk workers now field questions about housing applications and tax forms that once went to agencies with dedicated caseworkers. Some systems have hired social workers. Most have not.",
      "Still, circulation of physical books is up in many systems for the third straight year. It turns out that when you give people a warm, free, quiet place to be, some of them pick up a novel.",
    ],
  },
  {
    title: "Council Delays Vote on Downtown Parking Plan",
    author: "quill-ginger",
    paragraphs: [
      "The city council postponed a vote on the proposed downtown parking overhaul Tuesday after more than three hours of public comment. The plan would replace most meters with app-based pricing that rises during peak hours. A revised draft is expected next month.",
    ],
  },
  {
    title: "In Praise of the Unfinished Garden",
    author: "banjo-raft",
    image: "garden-wild",
    caption: "A corner left to itself: seed heads, volunteers, and whatever the birds planted.",
    paragraphs: [
      "My garden has never been finished and, at this point, I suspect it never will be. There is a bed along the fence that I have been meaning to redo for six years. In that time it has hosted tomatoes, a volunteer squash of unknown parentage, a colony of mint that I regret, and, last summer, a family of rabbits that I did not.",
      "Gardening books are full of plans: borders drawn to scale, bloom calendars, color wheels. I own several and have followed none. What I have learned instead is that a garden is a conversation, and the other party gets a vote. The foxgloves go where they like. The clay decides what lives.",
      "There is a particular pleasure in the unfinished. It leaves room for accident, for the self-sown poppy in the gravel path, for the afternoon you meant to weed and instead sat watching bees work the oregano you forgot to cut back. A finished garden would be a photograph. Mine is weather.",
    ],
  },
  {
    title: "A Short History of the Semicolon, and Why It Refuses to Die",
    author: "winter-beacon",
    paragraphs: [
      "The semicolon was invented in Venice in 1494 by the printer Aldus Manutius, who wanted a pause longer than a comma but shorter than a colon. It has been under attack more or less ever since. Kurt Vonnegut called it a transvestite hermaphrodite representing absolutely nothing. Style guides warn against it. Teachers circle it in red.",
      "And yet it persists; it thrives, even, in the prose of people who think carefully about rhythm. The semicolon joins two thoughts that belong together without pretending they are one. It is the punctuation of the considered afterthought, of balance, of the sentence that knows it could have stopped but chose not to.",
      "Use it sparingly. But use it.",
    ],
  },
  {
    title: "Opinion: Stop Calling Everything a Journey",
    author: "magma",
    paragraphs: [
      "A mortgage is not a journey. Neither is a diet, a software update, or the process of choosing a paint color. A journey has a place you leave and a place you arrive, and at least one moment when you regret packing so much.",
      "The word has been stretched over so many things that it no longer covers any of them. When my bank thanks me for being on a journey with it, I want to ask where we are going and whether it is too late to get off.",
      "I propose a moratorium. For one year, a journey requires luggage. Everything else can go back to being what it was: an errand, a habit, a job, a long afternoon.",
    ],
  },
  {
    title: "High School Robotics Team Heads to Nationals",
    author: "shore-juniper",
    paragraphs: [
      "The Eastfield High robotics team, which built its competition robot from salvaged parts in a borrowed garage, placed second at the regional championship and will travel to the national finals in Houston next month. The team is raising funds for travel.",
    ],
  },
  {
    title: "What the Night Shift Knows",
    author: "yarn-pine",
    image: "night-city",
    caption: "The city after midnight, when the second shift takes over.",
    paragraphs: [
      "At 3 a.m. the city belongs to a different population: bakers, nurses, security guards, the men who restock grocery shelves, the women who clean office towers after the bankers go home. They pass one another on empty buses and nod. They know things the day shift does not.",
      "They know which gas station has decent coffee after midnight and which convenience store clerk will let you use the bathroom. They know the exact minute the streetlights switch off. They know that the hour before dawn is the loneliest of the day and also, strangely, the most companionable.",
      "Roughly one in six American workers works outside standard daytime hours. Research links night work to higher rates of heart disease, diabetes, and depression. The people I spoke with know this. Most of them would still not trade.",
      "“Nobody watches you at night,” said a warehouse picker named Luis, who has worked graveyard for eleven years. “You do the job, you go home. The sun comes up while you're driving. That part, I'd miss.”",
    ],
  },
  {
    title: "Letter: The Bike Lanes Are Working",
    author: "thunder-hollow",
    paragraphs: [
      "As someone who opposed the Elm Street bike lanes two years ago, I owe the council an apology. My commute is no slower, the street is quieter, and my daughter now rides to school. I was wrong, and I am glad I was.",
    ],
  },
  {
    title: "The Case for Boring Software",
    author: "ocean-dune",
    paragraphs: [
      "Every few years a new framework promises to change how we build everything. Some of them do. Most of them change how we build things for about eighteen months, after which we are left maintaining a system written in a dialect nobody hires for anymore.",
      "Boring software is software whose failure modes are known. It has been run in production by people who were not its authors. Its documentation answers questions you actually have. When it breaks, someone has already posted the fix.",
      "## Novelty is a budget",
      "The most useful rule I know is to treat novelty as a budget. A project can afford one or two genuinely new things; everything else should be dull. Spend the budget where it gives you an advantage your competitors cannot easily copy, and nowhere else.",
      "This is not an argument against progress. It is an argument for choosing, deliberately, where you want to be surprised.",
    ],
  },
  {
    title: "Farmers Market Returns to Riverside Park",
    author: "quill-ginger",
    image: "farmers-market",
    caption: "Vendors setting up at Riverside Park on opening morning.",
    paragraphs: [
      "After a two-year absence, the Saturday farmers market is back at Riverside Park, with thirty-one vendors selling produce, cheese, bread, and flowers. Organizers say the new location near the bandstand offers more shade and easier parking than the old lot on Front Street.",
      "The market runs from eight until one through the end of October. Several vendors accept food assistance benefits, and a token program doubles their value for fruit and vegetables.",
    ],
  },
  {
    title: "On Learning to Swim at Forty-Three",
    author: "sleet-larch",
    paragraphs: [
      "I grew up four hundred miles from the nearest ocean, in a family that regarded public pools as places where you caught things. By the time I was an adult, not knowing how to swim had hardened into an identity. I was the one who watched the bags.",
      "Last winter I signed up for a beginner class at the community center. There were five of us: a retired postman, two college students, a woman who had nearly drowned as a child, and me. The instructor, who could not have been older than twenty, treated us with a patience I have rarely encountered anywhere.",
      "The first lesson was putting our faces in the water. The second was blowing bubbles. By the sixth, I could float on my back without panicking, staring up at the ceiling tiles, listening to my own breathing, astonished that the water would hold me if I let it.",
      "I can swim now, badly. A length of the pool leaves me gasping. But there is a particular freedom in doing something you had decided, long ago, you would never do. It reopens the question of what else you decided.",
    ],
  },
  {
    title: "Hot Springs Reopen After Two Winters of Repairs",
    author: "magma",
    image: "magma-springs",
    caption: "The upper pool on its first morning back.",
    paragraphs: [
      "The public baths at Kettle Flat reopened Saturday after a rockslide closed them for two winters. About three hundred people came on the first day, some carrying the same towels they had hung up in the changing room the week it shut.",
      "The repairs moved the lower pool twelve feet east and added a railing nobody likes. The water is as it was: slightly too hot, faintly sulfurous, and free.",
      "Attendants report that the first person in was an eighty-four-year-old man who had been waiting at the gate since five. He stayed for forty minutes and declined to comment.",
    ],
  },
  {
    title: "Power Outage Hits North Side",
    author: "shore-juniper",
    paragraphs: [
      "About 4,200 households lost power for nearly three hours Thursday evening after a transformer failure near the Maple Avenue substation. The utility says service has been fully restored and that aging equipment in the area is scheduled for replacement next year.",
    ],
  },
  {
    title: "The Map Is Not the Territory, but It Helps",
    author: "winter-beacon",
    image: "old-map",
    caption: "A surveyor's map from the 1890s, annotated by three generations of owners.",
    paragraphs: [
      "My grandfather kept a road atlas in the door pocket of every car he ever owned. When the spine cracked he taped it. When the roads changed he penciled them in. By the end, the atlas was less a map of the country than a map of his life in it: the routes he took, the detours he remembered, the diner outside Albuquerque circled twice.",
      "Phones have made us better at arriving and worse at knowing where we are. Studies of navigation suggest that people who follow turn-by-turn directions form weaker mental maps of the places they travel through. We get there; we just could not tell you how.",
      "I have started keeping a paper map in the car again. I rarely use it. But when I do, I see the whole shape of a place at once, the river I am following, the town I will skip, the road not taken, and I feel, briefly, located.",
    ],
  },
  {
    title: "Ten Minutes With the City's Oldest Barber",
    author: "yarn-pine",
    paragraphs: [
      "Walter Greaves is ninety-one and still cuts hair three mornings a week in the shop on Delancey he opened in 1961. He has given haircuts to four mayors, one astronaut, and, by his count, eleven thousand boys on their way to their first job interview.",
      "His advice to the young barbers who stop in to watch: “Listen more than you cut. The hair grows back. The conversation doesn't.”",
    ],
  },
  {
    title: "Opinion: Four-Day School Weeks Deserve a Harder Look",
    author: "garden-slate",
    paragraphs: [
      "More than 2,000 schools across the country have moved to a four-day week, most of them in rural districts struggling to hire teachers. The appeal is obvious. The evidence is not.",
      "Early studies suggest modest learning losses, concentrated among students who most depend on school for meals, supervision, and structure. A long weekend is a gift to a family with a parent at home. It is a burden to one without.",
      "Before more districts sign on, we should ask who is covering the fifth day, and at what cost.",
    ],
  },
  {
    title: "Sourdough, Year Three: A Progress Report",
    author: "umber-lantern",
    image: "bread-loaf",
    caption: "Loaf number 212, by the author's count.",
    paragraphs: [
      "The starter, whose name is Gerald, turned three this month. He has survived two moves, one week of neglect in a hot car, and the brief period when I tried to convert him to rye. He is more reliable than I am.",
      "The loaves have improved in ways that are hard to describe and easy to taste. The crumb is more open. The crust crackles when it cools. I no longer weigh the flour to the gram, which feels like either mastery or giving up, and I am honestly not sure which.",
      "What I did not expect was how much of baking is waiting. Mixing takes ten minutes. The rest is a day of checking, poking, and leaving it alone. Bread has taught me more about patience than anything else I own.",
    ],
  },
  {
    title: "Stray Cat Elected Honorary Mayor of Pine Hollow",
    author: "shore-juniper",
    image: "cat-porch",
    caption: "The new honorary mayor, holding office hours on a porch on Elm Street.",
    paragraphs: [
      "In a write-in campaign organized by the local historical society, a ginger tabby known as Biscuit has been named honorary mayor of Pine Hollow. Biscuit has no stated platform but is known to support naps and oppose dogs.",
    ],
  },
  {
    title: "The Weight of Inherited Furniture",
    author: "banjo-raft",
    paragraphs: [
      "When my mother died, my brother and I divided her things over a long weekend. Most of it was easy. Then we came to the dining table, a massive walnut thing that had been her mother's, that neither of us had room for and neither of us could bear to sell.",
      "It is in my living room now, taking up most of it. I eat at it alone most nights. Some evenings I resent it. Other evenings I run my hand along the scratch my grandfather made moving it in 1958, and I understand that I am not its owner so much as its current custodian.",
      "Objects outlive us. That is both their burden and their gift.",
    ],
  },
  {
    title: "A Field Guide to the Rocks in Your Driveway",
    author: "magma",
    paragraphs: [
      "Most gravel is crushed limestone and has nothing to say. But if your driveway was laid cheaply, and most were, it holds river stone from wherever the quarry found it, and river stone has been places.",
      "The grey ones with white stripes are gneiss, which was once something else entirely and was squeezed until it changed its mind. The red ones are jasper or brick; lick one to find out, since brick sticks to the tongue.",
      "The black glassy chips are the prize. They are basalt, cooled lava, and each one was liquid once, under a sky with no people in it. It is now under your car.",
      "None of this will improve the driveway. It may improve the walk to the mailbox.",
    ],
  },
  {
    title: "Transit Authority Unveils New Night Bus Routes",
    author: "quill-ginger",
    paragraphs: [
      "Three new overnight bus routes will begin service next month, connecting the hospital district, the airport, and the east side industrial park between midnight and 5 a.m. Officials say the routes respond to a survey of shift workers.",
    ],
  },
  {
    title: "Why I Stopped Reviewing Restaurants",
    author: "larch-lantern",
    image: "restaurant-table",
    caption: "A table set for a meal the author no longer writes about.",
    paragraphs: [
      "For nine years I ate out five nights a week and wrote about it. I have had tasting menus that cost more than my first car and noodles from a cart that I still think about. I quit last spring, and people keep asking why.",
      "The honest answer is that I stopped trusting my own palate. After enough meals, everything becomes a comparison: this sauce against that one, this room against the last. I could tell you precisely why a dish was good. I could no longer tell you whether I had enjoyed it.",
      "## The problem with stars",
      "Criticism also shapes what it describes. Restaurants started cooking for reviewers: plating for photographs, building menus around a signature dish that would read well in print. The places I loved most were ones that did not care what I thought, and there were fewer of them every year.",
      "I still eat out. I just do not take notes. Last week I had a bowl of soup at a counter near the train station and it was, I think, very good. I will never know for sure, and that is the point.",
    ],
  },
  {
    title: "A Walk Through the Flooded Quarter",
    author: "parsley-clay",
    image: "flooded-street",
    caption: "Water standing in the lower quarter two days after the river crested.",
    paragraphs: [
      "Three weeks after the river crested, the lower quarter still smells of mud. Mattresses line the curbs. The high-water mark, a neat brown stripe at chest height, runs unbroken along every wall, as though someone had drawn it with a ruler.",
      "Residents are doing what residents do: pulling up floors, hosing out basements, arguing with insurers. Volunteers from churches three counties away arrive each morning with gloves and sandwiches. The mood is less grief than exhaustion, a kind of grim, practical cheer.",
      "This is the third major flood in twelve years. Some families are leaving for good. Others say they will rebuild again, because this is home, and because the alternatives cost money they do not have. The city is studying a buyout program. Studies, people here will tell you, do not pump out basements.",
    ],
  },
  {
    title: "Library Extends Weekend Hours",
    author: "thunder-hollow",
    paragraphs: [
      "Beginning in October, the central library will stay open until 8 p.m. on Saturdays and open at noon on Sundays. The change follows a petition signed by more than 1,500 patrons, many of them students without quiet space at home.",
    ],
  },
  {
    title: "Chess Club Seeks New Members",
    author: "thunder-hollow",
    paragraphs: [
      "The Thursday evening chess club at the public library welcomes players of all levels. Boards are provided. The club's strongest player is a twelve-year-old named Anika, who asks that newcomers not be discouraged.",
    ],
  },
  {
    title: "The Economics of a Corner Store",
    author: "ocean-dune",
    paragraphs: [
      "The bodega on my block sells roughly four hundred items in a space smaller than most living rooms. The owner, Hassan, knows the margin on every one of them. Milk loses money. Lottery tickets barely break even. Cigarettes, coffee, and sandwiches keep the lights on.",
      "He opens at six and closes at midnight, seven days a week, with help from his brother and a nephew. By his estimate the store clears about as much as a mid-level office job, spread across three people and ninety hours a week.",
      "Why do it? He shrugs. The neighborhood needs it. His kids went to college on it. And he likes, he says, knowing everyone's name.",
    ],
  },
  {
    title: "What We Talk About When We Talk About the Weather",
    author: "sleet-larch",
    image: "storm-clouds",
    caption: "A front moving in over the valley on Tuesday afternoon.",
    paragraphs: [
      "Small talk about the weather is usually dismissed as the lowest form of conversation. I have come to think it is one of the most useful. It is the one topic everyone shares, that offends no one, that invites agreement. “Cold one today” is not a statement about temperature. It is a way of saying: we are here together, in this.",
      "Lately the weather talk has changed. People mention fires on the other side of the continent, the strange warm December, the storm that came out of nowhere. The old reassurance is harder to find. But the impulse, to turn to a stranger and name what is happening to both of you, remains. Maybe it matters more now.",
    ],
  },
  {
    title: "Letter From the Caldera: The Town That Farms a Crater",
    author: "magma",
    image: "magma-terraces",
    caption: "Terraced plots on the inner wall, planted to the rim.",
    paragraphs: [
      "From the rim road the crater looks like a bowl someone has carefully lined with green cloth. Every foot of the inner wall is terraced. The soil is ash, four thousand years old and absurdly rich, and the families who farm it will tell you that their grandparents chose well.",
      "There are forty-one households in the bowl and one road out, which climbs the wall in nineteen switchbacks. The bus makes the trip twice a day. It has never gone over the edge, a fact the driver mentions before anyone asks.",
      "## Cabbages the size of chairs",
      "The crater grows cabbages that have to be carried by two people. It grows a small sour plum that exists nowhere else and that the government has twice tried to register and twice given up on, since no two families agree on its name.",
      "What it does not grow is young people. The school has nine pupils. The plum harvest is brought in by cousins who drive up from the coast for a week and leave with sore backs and a crate each.",
      "I asked a farmer what would happen if the mountain woke. He looked at the terraces for a while and said that then it would be someone else's turn to have good soil, in four thousand years.",
      "Then he handed me a cabbage. I needed both arms.",
    ],
  },
  {
    title: "Road Closure on Route 9 Through Friday",
    author: "shore-juniper",
    paragraphs: [
      "Route 9 between Miller Road and the county line will be closed through Friday for bridge deck repairs. Detours are posted via Route 22. Expect delays of fifteen to twenty minutes during the morning commute.",
    ],
  },
  {
    title: "The Art of the Handwritten Letter",
    author: "larch-lantern",
    paragraphs: [
      "I received a letter last week, a real one, with a stamp and handwriting I recognized before I opened it. I read it three times. I have not read any email three times in my life.",
      "A letter costs something. It takes time to write, cannot be edited without showing the edit, and arrives days after it was sent, into a moment the writer could not see. That friction is not a flaw. It is the whole point.",
    ],
  },
  {
    title: "Inside the Race to Save the Region's Oldest Orchard",
    author: "garden-slate",
    image: "apple-orchard",
    caption: "Rows of heritage trees, some more than a century old.",
    paragraphs: [
      "On a hillside above the valley, among trees planted before the Civil War, a small group of volunteers is trying to rescue apples that exist nowhere else. The orchard's last commercial owner died in 2019. Since then, the trees have gone largely untended, and some of the rarest varieties are down to a single aging specimen.",
      "The volunteers, led by a retired high school biology teacher named Frances Hale, spend winter weekends taking cuttings and grafting them onto young rootstock. It is slow, careful work. Each variety needs to be identified, often by comparing fruit and leaves against century-old nursery catalogs.",
      "## Varieties with no names",
      "Some of the trees cannot be identified at all. Hale's team has given them provisional names based on where they stand: Lower Wall, Split Trunk, The One by the Gate. One of them produces a small, russeted apple that tastes, according to everyone who has tried it, faintly of pear and anise.",
      "“We may be the last people who ever taste some of these,” Hale said. “Or we may be the first people who make sure we aren't.”",
      "The group has now propagated more than sixty varieties and planted a new block of trees on land donated by a neighbor. The first of those trees fruited this fall. It was, Hale reports, a very good apple.",
    ],
  },
  {
    title: "A Defense of the Afternoon Nap",
    author: "winter-beacon",
    paragraphs: [
      "Twenty minutes. That is all it takes. A short nap after lunch improves alertness, mood, and memory, and costs less than a coffee. Entire civilizations built their days around it. We built ours around the open-plan office. Guess which one was a mistake.",
    ],
  },
  {
    title: "Youth Orchestra Performs Free Concert Sunday",
    author: "thunder-hollow",
    paragraphs: [
      "The Metro Youth Orchestra will perform Dvořák's Ninth Symphony at the band shell Sunday at 4 p.m. Admission is free. Bring a blanket; seating is on the lawn.",
    ],
  },
  {
    title: "The Long Goodbye of the Shopping Mall",
    author: "ocean-dune",
    image: "empty-mall",
    caption: "The food court, closed since March.",
    paragraphs: [
      "The Westgate Mall opened in 1974 with a fountain, a Sears, and a line out the door. It closes for good next month. On a recent weekday afternoon, its corridors held a few mall walkers, a teenager on a skateboard, and a security guard who greeted each of them by name.",
      "Malls were built on the idea that shopping was a place you went. The internet made shopping a thing you did from anywhere, and the mall's reason for existing drained away store by store. What remains is a kind of civic ruin: a big, climate-controlled room that nobody quite knows what to do with.",
      "Proposals for Westgate's future include apartments, a community college campus, and a medical center. The fountain, drained since 2016, will be removed. Several longtime residents have asked for a coin from it.",
    ],
  },
  {
    title: "Notes on Boiling an Egg at Altitude",
    author: "magma",
    paragraphs: [
      "At eleven thousand feet water boils at a temperature that would embarrass a kettle. An egg that takes seven minutes at the coast takes eleven up here, and comes out worse.",
      "The hut warden's method is to boil it for twelve, forget about it, and eat it cold on the ridge. This works.",
    ],
  },
  {
    title: "Notes From a First-Time Juror",
    author: "yarn-pine",
    paragraphs: [
      "I was summoned, I showed up, and to my surprise I was chosen. The trial lasted four days. It concerned a car accident and a disputed left turn, and it was, in its quiet way, one of the most moving things I have ever witnessed.",
      "Twelve strangers, none of whom wanted to be there, sat in a windowless room and argued, carefully and in good faith, about what was fair. Nobody raised their voice. A retired electrician changed his mind twice. When we reached a verdict, a woman who had barely spoken all week said, “I hope we got it right,” and everyone nodded.",
      "I do not know if we got it right. I know we tried. It is a strange and hopeful thing that the system depends on that.",
    ],
  },
  {
    title: "Recycling Pickup Moves to Wednesdays",
    author: "quill-ginger",
    paragraphs: [
      "Starting next month, curbside recycling in all city districts will be collected on Wednesdays instead of Fridays. Trash pickup days are unchanged. Residents can check the new calendar on the city's website.",
    ],
  },
  {
    title: "How a Small Town Saved Its Movie Theater",
    author: "banjo-raft",
    image: "movie-theater",
    caption: "The restored marquee, lit again for opening night.",
    paragraphs: [
      "When the owners of the Orpheum announced they would close the single-screen theater after eighty-six years, the town of Millbrook did something unusual: it bought it. More than six hundred residents pooled money to form a nonprofit that now runs the theater, sells the popcorn, and chooses the films.",
      "The programming is eclectic: new releases on weekends, classics on Tuesdays, a children's matinee every Saturday morning. Volunteers staff the concession stand. The projectionist is a nineteen-year-old who learned the job from the previous projectionist, who is eighty.",
      "Attendance is up. More importantly, people say, the marquee is lit again on Main Street, and that turns out to matter more than anyone expected.",
    ],
  },
  {
    title: "The Trouble With Productivity Advice",
    author: "sleet-larch",
    paragraphs: [
      "Every productivity system I have tried has worked beautifully for about eleven days. Then life intervenes, the system collapses, and I am left with a half-used notebook and a lingering sense of personal failure.",
      "I have come to suspect the problem is not the systems but the premise: that the goal of a day is to get the most done. Some of my most important days were ones where I got almost nothing done at all.",
    ],
  },
  {
    title: "Lost Dog Reunited With Family After 400-Mile Journey",
    author: "shore-juniper",
    paragraphs: [
      "A border collie named Pepper, missing for seven weeks after a highway accident, was found at an animal shelter four hundred miles from home and returned to her family Monday. A microchip made the match. Pepper is reported to be tired but well.",
    ],
  },
  {
    title: "Letter From the Coast: Winter Light",
    author: "parsley-clay",
    image: "winter-coast",
    caption: "Low sun on the coast in January.",
    paragraphs: [
      "In winter the seaside town empties out. The ice cream stands board their windows, the rental cottages go dark, and the people who remain are the ones who actually live here: fishermen, a few retirees, the woman who runs the hardware store and knows what everyone is building.",
      "The light changes too. It comes in low and sideways off the water, silvering everything, making even the parking lot beautiful for twenty minutes at four in the afternoon. The summer visitors never see it. That is, I think, the town's private reward for staying.",
    ],
  },
  {
    title: "Why Local News Still Matters",
    author: "larch-lantern",
    paragraphs: [
      "When a town loses its newspaper, researchers have found, local government borrowing costs rise, voter turnout falls, and fewer people run for office. Nobody is watching, and everybody can tell.",
      "Local news is not glamorous. It is school board meetings and zoning variances and the results of the county fair. It is also the only record, often, of what a community decided and why. Lose it, and a place begins to forget itself.",
    ],
  },
  {
    title: "Welcome to the Paper",
    author: "lichen-breeze",
    paragraphs: [
      "This is a newspaper that anyone can write for. Pieces are laid out fresh on every page, the way an editor might set them, and the front page picks its own cover. Read something. Then write something.",
    ],
  },
];
