import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import {recordSample, sampleX} from './history.js';
export function createGraph(color) {
    const graph = new St.DrawingArea({width: 100, height: 26,
        y_align: Clutter.ActorAlign.CENTER});
    graph._samples = [];
    const rgb = color.match(/[a-f\d]{2}/gi).map(c => parseInt(c, 16) / 255);
    graph.connect('repaint', area => {
        const cr = area.get_context();
        const [totalWidth, height] = area.get_surface_size();
        const width = totalWidth - 28;
        const pad = 2;
        const baseline = height - pad;
        cr.setSourceRGBA(1, 1, 1, 0.055);
        cr.rectangle(0, 0, width, height);
        cr.fill();
        cr.setSourceRGBA(1, 1, 1, 0.15);
        cr.setLineWidth(0.5);
        for (const y of [pad, height / 2, baseline]) {
            cr.moveTo(0, y); cr.lineTo(width, y);
        }
        cr.stroke();
        const samples = area._samples;
        if (samples.length) {
            const now = samples[samples.length - 1].time;
            const points = samples.map(s => [sampleX(s.time, now, width, pad),
                baseline - s.value * (height - 2 * pad)]);
            const path = () => {
                cr.moveTo(...points[0]);
                for (const point of points.slice(1)) cr.lineTo(...point);
            };
            if (points.length > 1) {
                path();
                cr.lineTo(points[points.length - 1][0], baseline);
                cr.lineTo(points[0][0], baseline);
                cr.closePath();
                cr.setSourceRGBA(...rgb, 0.18);
                cr.fill();
                path();
                cr.setSourceRGBA(...rgb, 1);
                cr.setLineWidth(1.5);
                cr.stroke();
            }
            cr.setSourceRGBA(...rgb, 1);
            const last = points[points.length - 1];
            cr.arc(last[0], last[1], 1.5, 0, 2 * Math.PI);
            cr.fill();
        }
        // Tick marks and labels sit outside the plotted area.
        cr.setSourceRGBA(1, 1, 1, 0.7);
        cr.setLineWidth(0.6);
        cr.selectFontFace('Sans', 0, 0);
        cr.setFontSize(7);
        for (const [value, label] of [[1, '100%'], [0.5, '50%'], [0, '0%']]) {
            const y = baseline - value * (height - 2 * pad);
            cr.moveTo(width, y);
            cr.lineTo(width + 3, y);
            cr.stroke();
            cr.moveTo(width + 5, Math.max(7, Math.min(height - 1, y + 2)));
            cr.showText(label);
        }
        cr.$dispose();
    });
    return graph;
}
export function updateGraph(graph, fraction) {
    const now = GLib.get_monotonic_time() / 1e6;
    graph._samples = recordSample(graph._samples, now, fraction);
    graph.queue_repaint();
}
