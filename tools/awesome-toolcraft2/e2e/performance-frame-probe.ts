import type { Page } from "@playwright/test";

import type { ToolcraftFrameProbeResult } from "./performance-measurement-evidence";

let frameProbeReporterSequence = 0;

function emptyToolcraftFrameProbeResult(): ToolcraftFrameProbeResult {
  return {
    longTaskCount: 0,
    longTaskMaxMs: 0,
    maxFrameGapMs: 0,
    sampleCount: 0,
  };
}

export function mergeToolcraftFrameProbeResults(
  results: readonly ToolcraftFrameProbeResult[],
): ToolcraftFrameProbeResult {
  return results.reduce<ToolcraftFrameProbeResult>(
    (merged, result) => ({
      longTaskCount: merged.longTaskCount + result.longTaskCount,
      longTaskMaxMs: Math.max(merged.longTaskMaxMs, result.longTaskMaxMs),
      maxFrameGapMs: Math.max(merged.maxFrameGapMs, result.maxFrameGapMs),
      sampleCount: merged.sampleCount + result.sampleCount,
    }),
    emptyToolcraftFrameProbeResult(),
  );
}

export async function startToolcraftFrameProbe(
  page: Page,
): Promise<() => Promise<ToolcraftFrameProbeResult>> {
  type FrameProbeReport = {
    kind: "checkpoint" | "final";
    result: ToolcraftFrameProbeResult;
  };
  let reportedCheckpoint = emptyToolcraftFrameProbeResult();
  const reportedFinalSegments: ToolcraftFrameProbeResult[] = [];
  const reporterName = `__toolcraftReportFrameProbe${++frameProbeReporterSequence}`;
  await page.exposeBinding(
    reporterName,
    (_source, report: FrameProbeReport) => {
      if (report.kind === "final") {
        reportedFinalSegments.push(report.result);
        return;
      }
      reportedCheckpoint = {
        longTaskCount:
          reportedCheckpoint.longTaskCount + report.result.longTaskCount,
        longTaskMaxMs: Math.max(
          reportedCheckpoint.longTaskMaxMs,
          report.result.longTaskMaxMs,
        ),
        maxFrameGapMs: Math.max(
          reportedCheckpoint.maxFrameGapMs,
          report.result.maxFrameGapMs,
        ),
        sampleCount: Math.max(
          reportedCheckpoint.sampleCount,
          report.result.sampleCount,
        ),
      };
    },
  );
  const probeId = await page.evaluate((currentReporterName) => {
    type FrameProbeReport = {
      kind: "checkpoint" | "final";
      result: ToolcraftFrameProbeResult;
    };
    type FrameProbe = {
      active: boolean;
      id: number;
      longTaskCount: number;
      longTaskMaxMs: number;
      observer?: PerformanceObserver;
      maxFrameGapMs: number;
      pageHideHandler?: () => void;
      rafId: number;
      sampleCount: number;
    };
    const win = window as Window & {
      __toolcraftCompletedFrameProbes?: Record<number, ToolcraftFrameProbeResult>;
      __toolcraftFrameProbe?: FrameProbe;
      __toolcraftFrameProbeSequence?: number;
      __toolcraftStopFrameProbe?: (probeId: number) => ToolcraftFrameProbeResult;
    };

    const emptyResult = (): ToolcraftFrameProbeResult => ({
      longTaskCount: 0,
      longTaskMaxMs: 0,
      maxFrameGapMs: 0,
      sampleCount: 0,
    });
    const reportProbe = (report: FrameProbeReport) => {
      const reporter = (
        win as unknown as Record<
          string,
          ((value: FrameProbeReport) => Promise<void>) | undefined
        >
      )[currentReporterName];
      void reporter?.(report);
    };
    const disposeProbe = (probe: FrameProbe): ToolcraftFrameProbeResult => {
      probe.active = false;
      cancelAnimationFrame(probe.rafId);
      probe.observer?.disconnect();
      if (probe.pageHideHandler) {
        window.removeEventListener("pagehide", probe.pageHideHandler);
      }
      return {
        longTaskCount: probe.longTaskCount,
        longTaskMaxMs: probe.longTaskMaxMs,
        maxFrameGapMs: probe.maxFrameGapMs,
        sampleCount: probe.sampleCount,
      };
    };

    win.__toolcraftCompletedFrameProbes ??= {};
    if (win.__toolcraftFrameProbe) {
      const previousProbe = win.__toolcraftFrameProbe;
      if (previousProbe.active) {
        win.__toolcraftCompletedFrameProbes[previousProbe.id] =
          disposeProbe(previousProbe);
      }
      win.__toolcraftFrameProbe = undefined;
    }

    const id = (win.__toolcraftFrameProbeSequence ?? 0) + 1;
    win.__toolcraftFrameProbeSequence = id;
    let lastFrame = performance.now();
    win.__toolcraftFrameProbe = {
      active: true,
      id,
      longTaskCount: 0,
      longTaskMaxMs: 0,
      maxFrameGapMs: 0,
      rafId: 0,
      sampleCount: 0,
    };

    try {
      win.__toolcraftFrameProbe.observer = new PerformanceObserver((list) => {
        const probe = win.__toolcraftFrameProbe;
        if (!probe?.active || probe.id !== id) {
          return;
        }

        for (const entry of list.getEntries()) {
          probe.longTaskCount += 1;
          probe.longTaskMaxMs = Math.max(probe.longTaskMaxMs, entry.duration);
          reportProbe({
            kind: "checkpoint",
            result: {
              ...emptyResult(),
              longTaskCount: 1,
              longTaskMaxMs: entry.duration,
              sampleCount: probe.sampleCount,
            },
          });
        }
      });
      win.__toolcraftFrameProbe.observer.observe({ entryTypes: ["longtask"] });
    } catch {
      // Some browser contexts do not expose longtask entries. Frame gaps still catch jank.
    }

    const tick = (now: number) => {
      const probe = win.__toolcraftFrameProbe;
      if (!probe?.active || probe.id !== id) {
        return;
      }

      const previousMaxFrameGapMs = probe.maxFrameGapMs;
      probe.maxFrameGapMs = Math.max(probe.maxFrameGapMs, now - lastFrame);
      probe.sampleCount += 1;
      lastFrame = now;
      if (probe.maxFrameGapMs > previousMaxFrameGapMs) {
        reportProbe({
          kind: "checkpoint",
          result: {
            ...emptyResult(),
            maxFrameGapMs: probe.maxFrameGapMs,
            sampleCount: probe.sampleCount,
          },
        });
      }
      probe.rafId = requestAnimationFrame(tick);
    };

    const reportOnPageHide = () => {
      const probe = win.__toolcraftFrameProbe;
      if (!probe?.active || probe.id !== id) return;

      const result = disposeProbe(probe);
      win.__toolcraftFrameProbe = undefined;
      reportProbe({ kind: "final", result });
    };
    win.__toolcraftFrameProbe.pageHideHandler = reportOnPageHide;
    window.addEventListener("pagehide", reportOnPageHide, { once: true });
    win.__toolcraftFrameProbe.rafId = requestAnimationFrame(tick);
    win.__toolcraftStopFrameProbe = (targetProbeId) => {
      const completedProbes = win.__toolcraftCompletedFrameProbes;
      if (
        completedProbes &&
        Object.prototype.hasOwnProperty.call(completedProbes, targetProbeId)
      ) {
        const completed = completedProbes[targetProbeId]!;
        delete completedProbes[targetProbeId];
        return completed;
      }

      const probe = win.__toolcraftFrameProbe;
      if (!probe || probe.id !== targetProbeId) return emptyResult();

      const result = disposeProbe(probe);
      win.__toolcraftFrameProbe = undefined;
      return result;
    };
    return id;
  }, reporterName);

  let stoppedResult: ToolcraftFrameProbeResult | undefined;
  return async () => {
    if (stoppedResult) return stoppedResult;

    let currentSegment: ToolcraftFrameProbeResult | undefined;
    try {
      currentSegment = await page.evaluate((targetProbeId) => {
        const win = window as Window & {
          __toolcraftStopFrameProbe?: (probeId: number) => ToolcraftFrameProbeResult;
        };

        return win.__toolcraftStopFrameProbe?.(targetProbeId);
      }, probeId);
    } catch {
      // Incremental checkpoints preserve the segment when navigation destroys the old context.
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    const preservedSegments = currentSegment
      ? [currentSegment]
      : reportedFinalSegments.length > 0
        ? reportedFinalSegments
        : [reportedCheckpoint];
    stoppedResult = mergeToolcraftFrameProbeResults(preservedSegments);
    return stoppedResult;
  };
}
