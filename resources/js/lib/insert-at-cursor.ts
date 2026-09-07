/**
 * Inserta `text` en la posición del cursor de `element` y devuelve el nuevo valor.
 * Restaura el foco y la posición del cursor después del render.
 */
export function insertAtCursor(element: HTMLInputElement | HTMLTextAreaElement, text: string): string {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    const value = element.value;
    const next = value.slice(0, start) + text + value.slice(end);

    requestAnimationFrame(() => {
        element.focus();
        const cursor = start + text.length;
        element.setSelectionRange(cursor, cursor);
    });

    return next;
}
