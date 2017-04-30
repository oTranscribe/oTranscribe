import { h, render, Component } from 'preact';

import {getShortcuts, setShortcut} from '../ui';
import keycode from 'keycode';

class Shortcut extends Component {
    render() {
        const {keyFn, keyCombos, onChange} = this.props;
        const listenForShortcut = function(keyFn) {
            this.setState({
                listening: true
            });
            listen(newKeyCombo => {
                onChange(keyFn, [].concat(keyCombos, newKeyCombo));
                this.setState({
                    listening: false
                });
            });
        };
        const combos = keyCombos.map(combo => (
            <span className="key-combo">{combo}</span>
        ));
        let addText = '+';
        if (this.state.listening) {
            addText = 'Listening...'
        }
        combos.push((
            <span
                className={`add-combo ${this.state.listening ? 'listening' : ''}`}
                onClick={listenForShortcut.bind(this, keyFn)}
            >{addText}</span>
        ));
        return (
            <li>
                <div class="shortcut-name">{keyFn}</div>
                <div class="shortcut-combos">{combos}</div>
            </li>
        );
    }
}

export default class KeyboardShortcutPanel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            shortcuts: getShortcuts()
        }
    }
    render() {
        const onChange = function(keyFn, keyCombos) {
            setShortcut(keyFn, keyCombos);
            console.log(getShortcuts())
            this.setState({
                shortcuts: getShortcuts()
            });
        }
        const shortcuts = this.state.shortcuts;
        const shortcutList = Object.keys(shortcuts).map(k => (
            <Shortcut keyFn={k} keyCombos={shortcuts[k]} onChange={onChange.bind(this)} />
        ));
        return (
            <ul className="keyboard-shortcuts">{shortcutList}</ul>
        );
    }
}

const listen = (cb) => {
    const eventHandler = event => {
        let key = keycode(event);
        if (key.match(/shift|cmd|command|ctrl|meta|mod|alt/g)) {
            return;
        }
        if (event.ctrlKey) {
            key = `ctrl+${key}`;
        }
        if (event.metaKey) {
            key = `mod+${key}`;
        }
        if (event.altKey) {
            key = `alt+${key}`;
        }
        if (event.shiftKey) {
            key = `shift+${key}`;
        }
        document.removeEventListener('keydown', eventHandler);
        event.preventDefault();
        event.stopPropagation();
        cb(key);
    };
    document.addEventListener('keydown', eventHandler);
}