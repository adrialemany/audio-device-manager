const { St, Gio, GLib, GObject, Clutter } = imports.gi;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;

const MIC_ICON = '🎤';
const SPEAKER_ICON = '🔊';

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

        this._refreshDevices();

        this._refreshLoop = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
            this._refreshDevices();
            return true;
        });
    }

    _refreshDevices() {
        this._menu.removeAll();

        const sinks = this._getDevices('sink');
        const sources = this._getDevices('source');

        const defaultSinkName = this._getDefaultDevice('sink');
        const defaultSourceName = this._getDefaultDevice('source');

        const defaultSink = this._getDescriptionForDevice(defaultSinkName, 'sink');
        const defaultSource = this._getDescriptionForDevice(defaultSourceName, 'source');

        // Barra superior: simplificar si contiene "Built-in"
        this._label.set_text(
            `${MIC_ICON} ${this._simplifyName(defaultSource)}  ${SPEAKER_ICON} ${this._simplifyName(defaultSink)}`
        );

        // Output Devices
        const outputHeader = new PopupMenu.PopupMenuItem('Output Devices', { reactive: false });
        outputHeader.label.set_style('color: #00ffff; font-weight: bold;');
        this._menu.addMenuItem(outputHeader);

        sinks.forEach(({ name, description }) => {
            const item = new PopupMenu.PopupMenuItem(description);
            item.connect('activate', () => this._setDefaultDevice('sink', name));
            this._menu.addMenuItem(item);
        });

        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Input Devices
        const inputHeader = new PopupMenu.PopupMenuItem('Input Devices', { reactive: false });
        inputHeader.label.set_style('color: #00ffff; font-weight: bold;');
        this._menu.addMenuItem(inputHeader);

        sources.forEach(({ name, description }) => {
            const item = new PopupMenu.PopupMenuItem(description);
            item.connect('activate', () => this._setDefaultDevice('source', name));
            this._menu.addMenuItem(item);
        });
    }

    _getDevices(type) {
        const out = GLib.spawn_command_line_sync(`pactl list ${type}s`)[1]
            .toString()
            .split('\n');

        const devices = [];
        let current = null;

        out.forEach(line => {
            if (line.startsWith(`${type[0].toUpperCase() + type.slice(1)} #`)) {
                if (current) devices.push(current);
                current = { name: '', description: '' };
            } else if (line.includes('Name:')) {
                current.name = line.split('Name:')[1].trim();
            } else if (line.includes('Description:')) {
                current.description = line.split('Description:')[1].trim();
            }
        });

        if (current) devices.push(current);
        return devices;
    }

    _getDescriptionForDevice(name, type) {
        const devices = this._getDevices(type);
        const found = devices.find(d => d.name === name);
        return found ? found.description : name;
    }

    _getDefaultDevice(type) {
        const out = GLib.spawn_command_line_sync(`pactl info`)[1]
            .toString()
            .split('\n');

        const key = type === 'sink' ? 'Default Sink:' : 'Default Source:';
        const line = out.find(l => l.startsWith(key));
        return line ? line.split(': ')[1] : null;
    }

    _simplifyName(name) {
        if (!name) return '?';
        if (name.includes('Built-in')) return 'Built-in';
        return name;
    }

    _setDefaultDevice(type, name) {
        Util.spawn(['pactl', `set-default-${type}`, name]);
    }

    destroy() {
        if (this._refreshLoop) {
            GLib.source_remove(this._refreshLoop);
            this._refreshLoop = null;
        }
        this._menu.destroy();
        super.destroy();
    }
});

let audioIndicator;

function init() {}

function enable() {
    audioIndicator = new AudioDeviceManager();

    const leftBox = Main.panel._leftBox;

    const spacer = new St.Widget({ x_expand: true });

    const container = new St.BoxLayout({ x_expand: true });
    container.add_child(spacer);
    container.add_child(audioIndicator);

    leftBox.add_child(container);
}

function disable() {
    if (audioIndicator) {
        audioIndicator.destroy();
        audioIndicator = null;
    }
}
