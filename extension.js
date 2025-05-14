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

        const defaultSinkDetails = this._getDeviceDetails(defaultSinkName, 'sink');
        const defaultSourceDetails = this._getDeviceDetails(defaultSourceName, 'source');

        const defaultSinkDesc = defaultSinkDetails ? defaultSinkDetails.description : defaultSinkName;
        const defaultSinkActivePort = defaultSinkDetails ? defaultSinkDetails.activePort : null;

        const defaultSourceDesc = defaultSourceDetails ? defaultSourceDetails.description : defaultSourceName;
        const simplifiedSourceName = this._simplifyName(defaultSourceDesc, null);
        const simplifiedSinkName = this._simplifyName(defaultSinkDesc, defaultSinkActivePort);


        this._label.set_text(
            `${MIC_ICON} ${simplifiedSourceName}  ${SPEAKER_ICON} ${simplifiedSinkName}`
        );

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
                current = { name: '', description: '', activePort: null };
            } else if (current) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('Name:')) {
                    current.name = trimmedLine.substring('Name:'.length).trim();
                } else if (trimmedLine.startsWith('Description:')) {
                    current.description = trimmedLine.substring('Description:'.length).trim();
                } else if (trimmedLine.startsWith('Active Port:')) { // New: Parse Active Port
                    current.activePort = trimmedLine.substring('Active Port:'.length).trim();
                }
            }
        });

        if (current) devices.push(current);
        return devices;
    }

    _getDeviceDetails(name, type) {
        if (!name) return null;
        const devices = this._getDevices(type);
        return devices.find(d => d.name === name) || null;
    }

    _getDefaultDevice(type) {
        const out = GLib.spawn_command_line_sync(`pactl info`)[1]
            .toString()
            .split('\n');

        const key = type === 'sink' ? 'Default Sink:' : 'Default Source:';
        const line = out.find(l => l.startsWith(key));
        return line ? line.split(': ')[1].trim() : null;
    }

    _simplifyName(description, activePort = null) {
        if (!description) return '?';

        if (activePort && activePort.toLowerCase().includes('headphone')) {
            return 'Headphones';
        }

        const descLower = description.toLowerCase();
        if (descLower.includes('headphones')) return 'Headphones';
        if (descLower.includes('built-in')) return 'Built-in';
        if (descLower.includes('speaker')) return 'Speakers';
        
        return description;
    }

    _setDefaultDevice(type, name) {
        Util.spawn(['pactl', `set-default-${type}`, name]);
    }

    destroy() {
        if (this._refreshLoop) {
            GLib.source_remove(this._refreshLoop);
            this._refreshLoop = null;
        }
        if (this._menu) {
            this._menu.destroy();
            this._menu = null;
        }
        super.destroy();
    }
});

let audioIndicator;

function init() {
}

function enable() {
    audioIndicator = new AudioDeviceManager();
    const existingContainer = Main.panel._leftBox.get_children().find(ch => ch.has_style_class_name && ch.has_style_class_name('audio-device-manager-container'));
    if (existingContainer) existingContainer.destroy();


    const container = new St.BoxLayout({ style_class: 'audio-device-manager-container', x_expand: true });
    const spacer = new St.Widget({ x_expand: true });
    
    container.add_child(spacer); 
    container.add_child(audioIndicator);
    
    Main.panel._leftBox.add_child(container);


}

function disable() {
    // Find and destroy the container as well if you used one in enable()
    const children = Main.panel._leftBox.get_children();
    for (let i = 0; i < children.length; i++) {
        if (audioIndicator && children[i] === audioIndicator.get_parent()) {
             children[i].destroy();
             break;
        }
    }

    if (audioIndicator) {
        audioIndicator.destroy();
        audioIndicator = null;
    }
}
