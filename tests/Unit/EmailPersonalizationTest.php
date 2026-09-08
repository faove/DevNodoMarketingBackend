<?php

namespace Tests\Unit;

use App\Models\Campana;
use App\Models\Cliente;
use App\Models\ClienteContacto;
use App\Services\CampaignRecipientResolver;
use App\Services\EmailTemplateRenderer;
use ReflectionMethod;
use Tests\TestCase;

class EmailPersonalizationTest extends TestCase
{
    public function test_renderer_interpolates_merge_tags_and_escapes_html(): void
    {
        config(['empresa.nombre' => 'DevNodo', 'empresa.email' => 'hola@devnodo.com']);

        $campana = new Campana([
            'nombre' => 'Lanzamiento',
            'asunto' => 'Hola {{cliente.nombre_completo}} — {{campana.nombre}}',
            'plantilla_html' => '<p>Hola {{cliente.nombre}} de {{cliente.ciudad}}. Empresa: {{empresa.nombre}}</p><p>{{cliente.razon_social}}</p>',
        ]);

        $cliente = new Cliente([
            'nombre' => 'Ana',
            'apellido' => 'Pérez',
            'razon_social' => '<script>x</script>',
            'ciudad' => 'Córdoba',
            'email_principal' => 'ana@example.com',
        ]);

        $renderer = new EmailTemplateRenderer;
        $snapshot = $renderer->renderSnapshot($campana, $cliente);

        $this->assertSame('Hola Ana Pérez — Lanzamiento', $snapshot['asunto']);
        $this->assertStringContainsString('Hola Ana de Córdoba', $snapshot['html']);
        $this->assertStringContainsString('Empresa: DevNodo', $snapshot['html']);
        $this->assertStringContainsString('&lt;script&gt;x&lt;/script&gt;', $snapshot['html']);
        $this->assertStringNotContainsString('<script>', $snapshot['html']);
    }

    public function test_renderer_falls_back_to_razon_social_for_nombre_completo(): void
    {
        $campana = new Campana([
            'nombre' => 'Test',
            'asunto' => '{{cliente.nombre_completo}}',
            'plantilla_html' => '',
        ]);

        $cliente = new Cliente([
            'razon_social' => 'Comercio C0158001',
        ]);

        $snapshot = (new EmailTemplateRenderer)->renderSnapshot($campana, $cliente);

        $this->assertSame('Comercio C0158001', $snapshot['asunto']);
    }

    public function test_invalid_email_principal_is_rejected(): void
    {
        $resolver = new CampaignRecipientResolver;
        $method = new ReflectionMethod(CampaignRecipientResolver::class, 'resolveDestino');
        $method->setAccessible(true);

        $cliente = new Cliente(['email_principal' => '0']);
        $cliente->setRelation('contactos', collect());

        [$destino, $origen] = $method->invoke($resolver, $cliente, null);

        $this->assertNull($destino);
        $this->assertNull($origen);
    }

    public function test_resolve_destino_prefers_chosen_contact(): void
    {
        $resolver = new CampaignRecipientResolver;
        $method = new ReflectionMethod(CampaignRecipientResolver::class, 'resolveDestino');
        $method->setAccessible(true);

        $contacto = new ClienteContacto([
            'id' => 99,
            'tipo' => 'email',
            'valor' => 'contacto@example.com',
            'es_principal' => false,
        ]);
        $contacto->id = 99;

        $cliente = new Cliente(['email_principal' => 'principal@example.com']);
        $cliente->setRelation('contactos', collect([$contacto]));

        [$destino, $origen] = $method->invoke($resolver, $cliente, 99);

        $this->assertSame('contacto@example.com', $destino);
        $this->assertSame('contacto_elegido', $origen);
    }
}
