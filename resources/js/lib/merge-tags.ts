export type MergeTag = {
    tag: string;
    label: string;
};

export const MERGE_TAGS: MergeTag[] = [
    { tag: '{{cliente.nombre_completo}}', label: 'Nombre completo' },
    { tag: '{{cliente.nombre}}', label: 'Nombre' },
    { tag: '{{cliente.apellido}}', label: 'Apellido' },
    { tag: '{{cliente.razon_social}}', label: 'Razón social' },
    { tag: '{{cliente.email}}', label: 'Email' },
    { tag: '{{cliente.ciudad}}', label: 'Ciudad' },
    { tag: '{{cliente.provincia}}', label: 'Provincia' },
    { tag: '{{empresa.nombre}}', label: 'Nombre de empresa' },
    { tag: '{{empresa.email}}', label: 'Email de empresa' },
];

export type MergeValues = Record<string, Record<string, string>>;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Interpola tags `{{namespace.campo}}`, espejo de App\Services\EmailTemplateRenderer::render().
 */
export function renderTemplate(contenido: string, valores: MergeValues): string {
    return contenido.replace(/\{\{\s*([a-z0-9_]+)\.([a-z0-9_]+)\s*\}\}/gi, (_match, namespace: string, campo: string) => {
        const ns = namespace.toLowerCase();
        const key = campo.toLowerCase();
        const value = valores[ns]?.[key];
        return value === undefined ? '' : escapeHtml(value);
    });
}
