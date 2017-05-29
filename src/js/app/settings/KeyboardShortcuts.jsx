import { h, render, Component } from 'preact';
import keycode from 'keycode';
import { correctModKey } from '../ui';

class Shortcut extends Component {
    render() {
        const {keyFn, keyCombos, onChange} = this.props;
        const listenForShortcut = function(keyFn) {
            this.setState({
                listening: true
            });
            listen(newKeyCombo => {
                if (this.state.listening === true) {
                    onChange(keyFn, [].concat(keyCombos, newKeyCombo));
                }
                this.setState({
                    listening: false
                });
            });
        };
        const cancelListen = function() {
            this.setState({
                listening: false
            });
        }
        const removeCombo = function(keyFn, index) {
            keyCombos.splice(index, 1)
            onChange(keyFn, keyCombos);
        };
        const combos = keyCombos.map((combo, i) => (
            <span className="key-combo">
                {correctModKey(combo)}
                <span className="remove-combo" onClick={removeCombo.bind(this, keyFn, i)}>
                    <i class="fa fa-times"></i>
                </span>
            </span>
        ));
        if (this.state.listening) {
            combos.push((
                <span className='listening-combo'>
                    {document.webL10n.get('listening')}
                    <span onClick={cancelListen.bind(this)}>
                        {document.webL10n.get('cancel')}
                    </span>
                </span>
            ));
        } else {
            combos.push((
                <span
                    className={`add-combo`}
                    onClick={listenForShortcut.bind(this, keyFn)}
                >+</span>
            ));
        }
        return (
            <li>
                <div class="shortcut-name">{document.webL10n.get(keyFn)}</div>
                <div class="shortcut-combos">{combos}</div>
            </li>
        );
    }
}

export default function KeyboardShortcutPanel(props) {
    const onChange = function(keyFn, keyCombos) {
        props.settings.shortcuts[keyFn] = keyCombos;
        props.onChange(props.settings);
    }
    const shortcutList = Object.keys(props.settings.shortcuts).map(k => (
        <Shortcut keyFn={k} keyCombos={props.settings.shortcuts[k]} onChange={onChange} />
    ));
    return (
        <div>
            <h3>{document.webL10n.get('keyboard-shortcuts')}</h3>
            <ul className="keyboard-shortcuts">{shortcutList}</ul>
            <div className="reset-button" onClick={props.reset}>
                {document.webL10n.get('restore-shortcuts')}
            </div>
        </div>
    );
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