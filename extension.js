const { St, GLib, GObject, Clutter } = imports.gi;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Volume = imports.ui.status.volume;

const MIC_ICON = '🎤';
const SPEAKER_ICON = '🔊';
const DEBOUNCE_MS = 200;

const SIGNALS = [
    'state-changed',
    'default-sink-changed',
    'default-source-changed',
    'output-added',
    'output-removed',
    'input-added',
    'input-removed',
    'active-output-update',
    'active-input-update',
];

function simplifyName(description, port = null) {
    if (!description)
        return '?';
    if (port && port.toLowerCase().includes('headphone'))
        return 'Headphones';

    const d = description.toLowerCase();
    if (d.includes('headphones'))
        return 'Headphones';
    if (d.includes('built-in'))
        return 'Built-in';
    if (d.includes('speaker'))
        return 'Speakers';
    return description;
}

const AudioDeviceManager = GObject.registerClass(
class AudioDeviceManager extends St.Bin {
    _init() {
        super._init({
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        this.add_style_class_name('panel-button');

        this._label = new St.Label({
            text: 'Audio',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._label.set_style('max-width: 350px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;');
        this.set_child(this._label);

        this._menu = new PopupMenu.PopupMenu(this, 0.5, St.Side.TOP, 0);
        Main.uiGroup.add_actor(this._menu.actor);
        this._menu.actor.hide();

        this.connect('button-press-event', () => {
            this._menu.toggle();
        });

        this._signature = '';
        this._debounceId = 0;
        this._signalIds = [];

        // Mismo mezclador que usa el menú de volumen de GNOME: sin procesos externos.
        this._control = Volume.getMixerControl();
        SIGNALS.forEach(sig => {
            try {
                this._signalIds.push(this._control.connect(sig, () => this._scheduleRefresh()));
            } catch (e) {
                log(`audio-device-manager: no se pudo conectar la señal ${sig}: ${e}`);
            }
        });

        this._refresh();
    }

    _scheduleRefresh() {
        if (this._debounceId)
            return;
        this._debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, DEBOUNCE_MS, () => {
            this._debounceId = 0;
            this._refresh();
            return GLib.SOURCE_REMOVE;
        });
    }

    _refresh() {
        if (!this._menu || !this._control)
            return;

        const sinks = this._control.get_sinks();
        const sources = this._control.get_sources();
        const defSink = this._control.get_default_sink();
        const defSource = this._control.get_default_source();

        const sinkPort = defSink?.get_port?.()?.port ?? null;
        const sinkName = simplifyName(defSink?.description, sinkPort);
        const sourceName = simplifyName(defSource?.description, null);

        const text = `${MIC_ICON} ${sourceName}  ${SPEAKER_ICON} ${sinkName}`;
        if (this._label.get_text() !== text)
            this._label.set_text(text);

        // Solo reconstruimos el menú si cambió la lista de dispositivos.
        const signature = JSON.stringify([
            sinks.map(s => [s.id, s.description]),
            sources.map(s => [s.id, s.description]),
        ]);
        if (signature !== this._signature) {
            this._signature = signature;
            this._rebuildMenu(sinks, sources);
        }
    }

    _rebuildMenu(sinks, sources) {
        this._menu.removeAll();

        const outputHeader = new PopupMenu.PopupMenuItem('Output Devices', { reactive: false });
        outputHeader.label.set_style('color: #00ffff; font-weight: bold;');
        this._menu.addMenuItem(outputHeader);

        sinks.forEach(sink => {
            const item = new PopupMenu.PopupMenuItem(sink.description);
            item.connect('activate', () => this._control.set_default_sink(sink));
            this._menu.addMenuItem(item);
        });

        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const inputHeader = new PopupMenu.PopupMenuItem('Input Devices', { reactive: false });
        inputHeader.label.set_style('color: #00ffff; font-weight: bold;');
        this._menu.addMenuItem(inputHeader);

        sources.forEach(source => {
            const item = new PopupMenu.PopupMenuItem(source.description);
            item.connect('activate', () => this._control.set_default_source(source));
            this._menu.addMenuItem(item);
        });
    }

    destroy() {
        if (this._debounceId) {
            GLib.source_remove(this._debounceId);
            this._debounceId = 0;
        }
        if (this._control) {
            this._signalIds.forEach(id => this._control.disconnect(id));
            this._signalIds = [];
            this._control = null;   // el mezclador es compartido: no se cierra
        }
        if (this._menu) {
            this._menu.destroy();
            this._menu = null;
        }
        super.destroy();
    }
});

/* ---------- ciclo de vida ---------- */

let audioIndicator = null;
let container = null;

function init() {}

function enable() {
    const existing = Main.panel._leftBox.get_children()
        .find(ch => ch.has_style_class_name && ch.has_style_class_name('audio-device-manager-container'));
    if (existing)
        existing.destroy();

    audioIndicator = new AudioDeviceManager();

    container = new St.BoxLayout({ style_class: 'audio-device-manager-container', x_expand: true });
    container.add_child(new St.Widget({ x_expand: true }));
    container.add_child(audioIndicator);

    Main.panel._leftBox.add_child(container);
}

function disable() {
    if (audioIndicator) {
        audioIndicator.destroy();
        audioIndicator = null;
    }
    if (container) {
        container.destroy();
        container = null;
    }
}
