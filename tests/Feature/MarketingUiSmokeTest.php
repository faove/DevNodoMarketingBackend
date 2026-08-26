<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketingUiSmokeTest extends TestCase
{
    public function test_login_page_renders(): void
    {
        $this->get('/login')->assertOk();
    }

    public function test_guest_is_redirected_from_dashboard(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_user_can_open_dashboard(): void
    {
        $user = User::query()->where('email', 'admin@devnodo.com')->first()
            ?? User::factory()->create([
                'email' => 'admin@devnodo.com',
            ]);

        $this->actingAs($user)
            ->get('/dashboard')
            ->assertOk();
    }

    public function test_authenticated_user_can_open_clientes(): void
    {
        $user = User::query()->where('email', 'admin@devnodo.com')->first()
            ?? User::factory()->create();

        $this->actingAs($user)
            ->get('/clientes')
            ->assertOk();
    }
}
