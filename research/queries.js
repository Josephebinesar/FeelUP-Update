/**
 * research/queries.js
 *
 * 30 benchmark queries across 3 emotional domains.
 * Vocabulary is intentionally DIFFERENT from seed posts
 * to test the embedding model's semantic gap bridging.
 *
 * Domain A (0–9):  Academic Stress
 * Domain B (10–19): Emotional Distress
 * Domain C (20–29): Social & Relational Pressure
 */

const QUERIES = [
    // ── Domain A: Academic Stress (10 queries) ──────────────────────────
    {
        id: "A01",
        domain: "Academic Stress",
        text: "I am terrified of checking my semester results because I know I will fail",
    },
    {
        id: "A02",
        domain: "Academic Stress",
        text: "My engineering backlog is making me feel like a complete failure with no future",
    },
    {
        id: "A03",
        domain: "Academic Stress",
        text: "I cannot concentrate on studying because the placement season is making me panic",
    },
    {
        id: "A04",
        domain: "Academic Stress",
        text: "Everyone else in my class got internships and I am still sitting at home doing nothing",
    },
    {
        id: "A05",
        domain: "Academic Stress",
        text: "I spent three months preparing for the interview and still got rejected, I feel worthless",
    },
    {
        id: "A06",
        domain: "Academic Stress",
        text: "My parents paid so much for my education and I am returning home with no degree",
    },
    {
        id: "A07",
        domain: "Academic Stress",
        text: "Every time I open the textbook my mind goes blank and I cannot retain anything",
    },
    {
        id: "A08",
        domain: "Academic Stress",
        text: "I missed so many classes this semester I do not even know what subjects I am failing",
    },
    {
        id: "A09",
        domain: "Academic Stress",
        text: "The competitive pressure from my peers is stopping me from sleeping at night",
    },
    {
        id: "A10",
        domain: "Academic Stress",
        text: "My CGPA is too low to apply to any company and I do not know what to do next",
    },

    // ── Domain B: Emotional Distress (10 queries) ────────────────────────
    {
        id: "B01",
        domain: "Emotional Distress",
        text: "I wake up every morning with this heavy feeling in my chest and I do not know why",
    },
    {
        id: "B02",
        domain: "Emotional Distress",
        text: "I have been pretending to be okay for so long I forgot what actually okay feels like",
    },
    {
        id: "B03",
        domain: "Emotional Distress",
        text: "Nothing brings me happiness anymore, everything just feels grey and pointless",
    },
    {
        id: "B04",
        domain: "Emotional Distress",
        text: "I keep crying without any reason and I am too embarrassed to tell anyone",
    },
    {
        id: "B05",
        domain: "Emotional Distress",
        text: "I feel completely drained all the time even after sleeping for ten hours",
    },
    {
        id: "B06",
        domain: "Emotional Distress",
        text: "There is a voice in my head constantly telling me I am not good enough for anything",
    },
    {
        id: "B07",
        domain: "Emotional Distress",
        text: "I do not see the point of continuing, every effort I make ends in disappointment",
    },
    {
        id: "B08",
        domain: "Emotional Distress",
        text: "My anxiety makes my heart race even when nothing is happening, it is exhausting",
    },
    {
        id: "B09",
        domain: "Emotional Distress",
        text: "I have been numb for weeks, I cannot feel happy or sad, just empty",
    },
    {
        id: "B10",
        domain: "Emotional Distress",
        text: "The smallest things trigger me now and I hate how sensitive I have become",
    },

    // ── Domain C: Social & Relational Pressure (10 queries) ─────────────
    {
        id: "C01",
        domain: "Social & Relational",
        text: "I am surrounded by people all day but I have never felt more alone in my life",
    },
    {
        id: "C02",
        domain: "Social & Relational",
        text: "My parents compare me to my cousin every single day and it is destroying my confidence",
    },
    {
        id: "C03",
        domain: "Social & Relational",
        text: "I had to end a three year friendship because it was becoming too toxic but I miss them",
    },
    {
        id: "C04",
        domain: "Social & Relational",
        text: "Nobody checks on me first, I am always the one starting conversations and I am tired",
    },
    {
        id: "C05",
        domain: "Social & Relational",
        text: "My family expects me to be the responsible one and I am breaking under that weight",
    },
    {
        id: "C06",
        domain: "Social & Relational",
        text: "I feel invisible in my friend group, like I could disappear and no one would notice",
    },
    {
        id: "C07",
        domain: "Social & Relational",
        text: "My roommate situation is making home feel unsafe and I have nowhere else to go",
    },
    {
        id: "C08",
        domain: "Social & Relational",
        text: "I told my best friend how I was feeling and they just changed the subject",
    },
    {
        id: "C09",
        domain: "Social & Relational",
        text: "Social media makes me feel like everyone has their life together except me",
    },
    {
        id: "C10",
        domain: "Social & Relational",
        text: "I moved to a new city for college and I have not made a single real friend in a year",
    },
];

module.exports = { QUERIES };
