export function createState(defaults, { eventTarget, onUpdate } = {}) {
    const state = eventTarget ? Object.assign(eventTarget, { ...defaults }) : { ...defaults };

    state.update = function update(key, value) {
        if (this[key] === value) return false;

        this[key] = value;
        onUpdate?.(this, key, value);
        return true;
    };

    return state;
}
