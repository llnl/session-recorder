# Session Recorder

I need to record every action that a user takes in a browser. Similar feeling to what playwright codegen does. This would include html snapshots (actual UI that is interactable like you see in the trace viewer), screenshot of the page of before and after each action, and state what element it performed on (e.g., click on button a). Currently Playwright Codegen does a LOT more than that.

Nice to Haves:
HTTP snapshots, console errors, http requests/responses for before and after of every event.

Remember that the Playwright trace does this, but we are recording a USER not just the programmatic actions. We cannot just use codegen or playwright mcp out of the box. It only records the programmatic calls to playwright through a spec file or mcp tool calls. We AREN'T doing either (except to only to open the browser), but after that we are letting the user perform actions which means we have to watch what the user is doing, and somehow tap into the snapshots. I only want to use the files I need.

When you create an HTML snapshot on the before snapshot, a property to the element that is being worked on. Something like data-recorded-el="true". To do this, we take each snapshot, remove all data recorded attributes and then add the data-recorded-el to the current element. This allows us to know exactly which element was recorded, no need to generate a selector. Since its an html snapshot, we can edit the html to include that property.

---

## The Core Insight

**Playwright's tracing captures programmatic actions** (test scripts, MCP tool calls)
**We need to capture USER actions** (clicks, typing, navigation that happen manually)

These are fundamentally different capture modes!

## The Solution: Extract What We Need

Instead of fighting with Playwright's client/server architecture and trying to use internal APIs from the wrong layer, we should:

1. **Copy the snapshot capture logic** from Playwright (the parts that work)
2. **Create our own standalone recorder** in `session-recorder/`
3. **Listen to user actions** directly in the browser
4. **Capture snapshots ourselves** using the extracted code

We will want to capture the before/after HTML snapshots, and before/after screenshots FIRST (POC 1). And must track what action was performed, and we can add a class to the element it performed an action on (data-recorded-el prop on that element). Then for POC 2, once POC 1 complete, then see if we can capture the console logs and network requests. Basically the flow is: before snapshot recorded, action performed, take element and add data-recorded-el prop, take after snapshot, remove added data-recorded-el prop, continue.

# Implementation Plan
Data captured for each action:

✅ Before HTML snapshot (interactive, with shadow DOM & styles, add session-recorded-element prop)
✅ Action metadata (type, text, etc.)
✅ After HTML snapshot
✅ Before screenshot
✅ After screenshot
✅ Console logs (POC 2)
✅ Network requests (POC 2)
✅ Highlighted element (with data-recorded-el prop)

Flow:

- User action detected (capture phase)
- data-recorded-el prop added to element interaction with
- Capture BEFORE (snapshot + screenshot)
- Let action execute
- Capture AFTER (snapshot + screenshot with highlighted element)
- Remove data-recorded-el prop
- Every thing that happens (before snapshot, after snapshot, action) should have a timestamp UTC date so it can align with voice recording we will do
