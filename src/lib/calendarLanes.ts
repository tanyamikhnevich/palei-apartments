/**
 * Stacking overlapping stays on the month calendar.
 *
 * A row of the calendar is one apartment across one month, and more than one
 * stay can want the same nights: two requests for the same week, or a request
 * sitting over a confirmed booking. Drawing them all at the same height means
 * whichever renders last wins and the other simply is not there — at exactly
 * the moment an overlap is the thing worth seeing.
 *
 * So each bar gets a lane, and the row grows to hold however many lanes it
 * needs. Kept out of the component because it is arithmetic, and arithmetic
 * that decides whether a double booking is visible deserves to be testable on
 * its own.
 */

/** Bar geometry, in pixels. */
export const LANE_HEIGHT = 28;
export const LANE_GAP = 4;
export const TRACK_PADDING = 7;

/** Anything with a horizontal extent, measured in day columns. */
export interface Laneable {
  /** Day columns from the 1st of the month. */
  offset: number;
  /** Width in day columns. */
  span: number;
  lane: number;
}

export function trackHeight(lanes: number): number {
  /* An empty row is still a row: one lane's worth of height, never zero. */
  const n = Math.max(1, lanes);
  return TRACK_PADDING * 2 + n * LANE_HEIGHT + (n - 1) * LANE_GAP;
}

export function laneTop(lane: number): number {
  return TRACK_PADDING + lane * (LANE_HEIGHT + LANE_GAP);
}

/**
 * Assign lanes in place, and report how many were needed.
 *
 * Greedy and left to right: the earliest stay first, each one dropped into the
 * topmost lane whose previous occupant has already ended. Touching stays — one
 * checking out the morning another checks in — share a lane, because they do
 * not actually overlap; `end <= offset` is what says so.
 */
export function packIntoLanes(bars: Laneable[]): number {
  const laneEnds: number[] = [];

  for (const bar of [...bars].sort((a, b) => a.offset - b.offset || b.span - a.span)) {
    let lane = laneEnds.findIndex((end) => end <= bar.offset);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = bar.offset + bar.span;
    bar.lane = lane;
  }

  return laneEnds.length;
}
