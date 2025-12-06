1. Although we see the input event typing in the right text, the snapshot is still showing the input as empty. How does playwright manage this when it makes a snapshot for traces? Does it add the value to the input in the trace viewer, or does it somehow save the state of the data in the snapshot itself? If the latter, how is that done?
2. In the playwright trace viewer, a snapshot is still interactive. But ours is not very interactive. Its like ours doesn't include the javascript? How does playwright trace viewer do it?
3. The html snapshot seems to not show the images from the original html in the viewer. Perhaps its because its a relative path? How does playwright trace viewer handle this when snapshotting images?
4. The Network tab always shows 0ms and 0ms on the far right of each request panel. Are we missing something? Also how hard would it be to capture network requests and responses in our recorder?
5. What does the "Export Session" do?
6. When you hover over images in the snapshot viewer, the tooltip overflows beyond the viewport.
7. When you click on a snapshot that is outside of the selected area, it does show the html snapshot, but it doesn't clear the timeline selection. I think it should clear the timeline selection when you click on a snapshot outside of the selected area because we want to see the action selected and the selected area filters it out.
