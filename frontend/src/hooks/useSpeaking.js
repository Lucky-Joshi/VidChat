import { useState, useEffect, useRef, useMemo } from 'react';

const POLL_INTERVAL_MS = 300;
const SPEAKING_THRESHOLD = 0.025;

export function useSpeakingDetection(streamsMap, localStream) {
  const [speakingIds, setSpeakingIds] = useState(() => new Set());
  const speakingRef = useRef(new Set());
  const latestRef = useRef({ streamsMap, localStream });

  latestRef.current = { streamsMap, localStream };

  const streamsKey = useMemo(
    () =>
      Object.keys(streamsMap || {})
        .sort()
        .join(',') + (localStream ? '+local' : ''),
    [streamsMap, localStream]
  );

  useEffect(() => {
    let audioContext = null;
    let pollTimer = null;
    const analysers = new Map();

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }
      audioContext = new AudioContextClass();
    } catch (error) {
      console.log('[SPEAKING] AudioContext unavailable, indicator disabled');
      return;
    }

    const attachAnalyser = (id, stream) => {
      if (analysers.has(id) || !stream) return;
      try {
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analysers.set(id, { source, analyser, data: new Uint8Array(analyser.fftSize) });
      } catch (error) {
        console.log(`[SPEAKING] Could not attach analyser for ${id}`);
      }
    };

    const detachAnalyser = (id) => {
      const entry = analysers.get(id);
      if (!entry) return;
      try {
        entry.source.disconnect();
      } catch (error) {
        console.log(`[SPEAKING] Error detaching analyser for ${id}`);
      }
      analysers.delete(id);
    };

    const computeLevel = (entry) => {
      entry.analyser.getByteTimeDomainData(entry.data);
      let sumSquares = 0;
      for (let i = 0; i < entry.data.length; i += 1) {
        const value = (entry.data[i] - 128) / 128;
        sumSquares += value * value;
      }
      return Math.sqrt(sumSquares / entry.data.length);
    };

    const syncAnalysers = () => {
      const { streamsMap: map, localStream: ls } = latestRef.current;
      const activeIds = new Set(Object.keys(map || {}));
      if (ls) {
        activeIds.add('local');
      }

      activeIds.forEach((id) => {
        attachAnalyser(id, id === 'local' ? ls : map[id]);
      });

      [...analysers.keys()].forEach((id) => {
        if (!activeIds.has(id)) {
          detachAnalyser(id);
        }
      });
    };

    const poll = () => {
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }

      const nextSpeaking = new Set();
      analysers.forEach((entry, id) => {
        if (computeLevel(entry) > SPEAKING_THRESHOLD) {
          nextSpeaking.add(id);
        }
      });

      const previous = speakingRef.current;
      const changed =
        previous.size !== nextSpeaking.size ||
        [...nextSpeaking].some((id) => !previous.has(id));
      if (changed) {
        speakingRef.current = nextSpeaking;
        setSpeakingIds(nextSpeaking);
      }
    };

    syncAnalysers();
    pollTimer = setInterval(() => {
      syncAnalysers();
      poll();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      [...analysers.keys()].forEach(detachAnalyser);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [streamsKey]);

  return speakingIds;
}
