import Clutter from 'gi://Clutter';
import St from 'gi://St';
import {createGraph, updateGraph} from './graphs.js';

export function setup(extension) {
    extension._meter = function (row, text, color = null) {
        const label = new St.Label({text, y_align: Clutter.ActorAlign.CENTER});
        row.add_child(label);
        const fill = color ? createGraph(color) : null;
        if (fill) row.add_child(fill);
        return {label, fill};
    };
    const row = extension._button.get_child_at_index(0);
    row.destroy_all_children();
    row.style = 'spacing: 18px; margin-left: 9px;';
    function group(title) {
        const box = new St.BoxLayout({style: 'spacing: 7px;'});
        box.add_child(new St.Label({text: title, y_align: Clutter.ActorAlign.CENTER}));
        row.add_child(box);
        return box;
    }
    const cpu = group('CPU');
    extension._cpu = extension._meter(cpu, '…%', '#78aeed');
    extension._temperature = extension._meter(cpu, '…°C', '#efb366');
    const ram = group('RAM');
    extension._ram = extension._meter(ram, '… GB', '#86cf9a');
    const gpu = group('GPU');
    extension._gpuTemp = extension._meter(gpu, '…°C', '#efb366');
    extension._gpu = extension._meter(gpu, '…%', '#78aeed');
    extension._vram = extension._meter(gpu, '… GB', '#b7a1e5');
    extension._meters = [extension._cpu, extension._temperature, extension._ram,
        extension._gpuTemp, extension._gpu, extension._vram];
    extension._set = function (meter, text, fraction = 0) {
        const value = text.replace(/^(CPU|GPU|RAM|VRAM) /, '');
        meter.label.text = value;
        if (meter === this._gpuTemp && text.includes('°C')) fraction = parseFloat(value) / 100;
        if (meter.fill) updateGraph(meter.fill, text.includes('N/A') ? NaN : fraction);
    };
}
