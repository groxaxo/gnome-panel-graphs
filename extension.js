import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import {setup} from './layout.js';
const decoder = new TextDecoder();
function read(path) {
    return new Promise((resolve, reject) => {
        const file = Gio.File.new_for_path(path);
        file.load_contents_async(null, (source, result) => {
            try { const [, bytes] = source.load_contents_finish(result); resolve(decoder.decode(bytes).trim()); }
            catch (error) { reject(error); }
        });
    });
}
export default class PanelGraphs extends Extension {
    enable() {
        this._active = true;
        this._generation = (this._generation ?? 0) + 1;
        this._previousCpu = null;
        this._busy = false;
        this._button = new PanelMenu.Button(0.5, 'System monitors', true);
        const row = new St.BoxLayout({style: 'spacing: 7px; margin-left: 9px;'});
        this._button.add_child(row);
        setup(this);
        Main.panel.addToStatusArea(this.uuid, this._button, -1, 'center');
        this._poll();
        this._timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this._poll(); return GLib.SOURCE_CONTINUE;
        });
    }
    async _poll() {
        if (this._busy) return;
        this._busy = true;
        const generation = this._generation;
        const valid = () => this._active && generation === this._generation;
        const tasks = [
            (async () => {
                const stat = await read('/proc/stat');
                if (!valid()) return;
                const ticks = stat.split('\n')[0].trim().split(/\s+/).slice(1, 9).map(Number);
                const sample = {total: ticks.reduce((a, b) => a + b, 0), idle: ticks[3] + ticks[4]};
                if (this._previousCpu) {
                    const total = sample.total - this._previousCpu.total;
                    if (total > 0) {
                        const usage = 1 - (sample.idle - this._previousCpu.idle) / total;
                        this._set(this._cpu, `CPU ${Math.round(usage * 100)}%`, usage);
                    }
                }
                this._previousCpu = sample;
            })().catch(() => { if (valid()) this._set(this._cpu, 'CPU N/A'); }),
            (async () => {
                const text = await read('/proc/meminfo');
                const total = Number(text.match(/^MemTotal:\s+(\d+)/m)[1]) * 1024;
                const available = Number(text.match(/^MemAvailable:\s+(\d+)/m)[1]) * 1024;
                if (valid()) this._set(this._ram, `RAM ${((total - available) / 1e9).toFixed(1)}/${(total / 1e9).toFixed(1)} GB`, (total - available) / total);
            })().catch(() => { if (valid()) this._set(this._ram, 'RAM N/A'); }),
            (async () => {
                if (!this._tempPath) {
                    const entries = Gio.File.new_for_path('/sys/class/hwmon').enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
                    try {
                        let entry;
                        while ((entry = entries.next_file(null))) {
                            const path = `/sys/class/hwmon/${entry.get_name()}`;
                            if (await read(`${path}/name`) === 'coretemp') { this._tempPath = path; break; }
                        }
                    } finally { entries.close(null); }
                }
                if (!this._tempPath) throw new Error('No CPU sensor');
                const [input, limit] = await Promise.all([read(`${this._tempPath}/temp1_input`), read(`${this._tempPath}/temp1_crit`)]);
                const temperature = Number(input) / 1000;
                if (valid()) {
                    this._set(this._temperature, `CPU ${Math.round(temperature)}°C`, Number(input) / Number(limit));
                    this._temperature.label.accessible_name = `CPU temperature ${Math.round(temperature)} degrees Celsius, graph maximum ${Number(limit) / 1000} degrees`;
                }
            })().catch(() => { if (valid()) this._set(this._temperature, 'CPU temp N/A'); }),
            new Promise(resolve => {
                try {
                    const process = Gio.Subprocess.new(['nvidia-smi', '--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu', '--format=csv,noheader,nounits'], Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
                    this._process = process;
                    process.communicate_utf8_async(null, null, (proc, result) => {
                        try {
                            const [, stdout] = proc.communicate_utf8_finish(result);
                            if (!valid()) return;
                            const [load, used, total, temperature] = stdout.trim().split('\n')[0].split(',').map(Number);
                            if (!proc.get_successful() || ![load, used, total, temperature].every(Number.isFinite) || total <= 0) throw new Error('No GPU readings');
                            this._set(this._gpu, `GPU ${Math.round(load)}%`, load / 100);
                            this._set(this._vram, `VRAM ${(used * 1048576 / 1e9).toFixed(1)}/${(total * 1048576 / 1e9).toFixed(1)} GB`, used / total);
                            this._set(this._gpuTemp, `GPU ${temperature}°C`);
                        } catch (error) {
                            if (valid()) {
                                this._set(this._gpu, 'GPU N/A'); this._set(this._vram, 'VRAM N/A'); this._set(this._gpuTemp, 'GPU temp N/A');
                            }
                        } finally { if (valid()) this._process = null; resolve(); }
                    });
                } catch (error) {
                    if (valid()) {
                        this._set(this._gpu, 'GPU N/A');
                        this._set(this._vram, 'VRAM N/A');
                        this._set(this._gpuTemp, 'GPU temp N/A');
                    }
                    resolve();
                }
            }),
        ];
        await Promise.allSettled(tasks);
        if (valid()) {
            this._busy = false;
            this._button.accessible_name = this._meters.map(m => m.label.text).join(', ');
        }
    }
    disable() {
        this._active = false;
        this._generation++;
        if (this._timer) GLib.Source.remove(this._timer);
        this._timer = null;
        this._process?.force_exit();
        this._process = null;
        this._button?.destroy();
        this._button = null;
    }
}
