import { h, render, Component } from 'preact';
import KeyboardShortcuts from './KeyboardShortcuts.jsx';


export default function(el) {
    render(
        (<div>
            <KeyboardShortcuts />
        </div>)
    , el);    
}
