<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_send_registros', function (Blueprint $table) {
            $table->id();
            $table->date('fecha');
            $table->unsignedInteger('campana_id')->nullable();
            $table->unsignedInteger('enviados')->default(0);
            $table->unsignedInteger('fallidos')->default(0);
            $table->unsignedInteger('omitidos')->default(0);
            $table->unsignedInteger('tope_diario')->default(50);
            $table->unsignedInteger('restantes_dia')->default(0);
            $table->string('notificado_a', 200)->nullable();
            $table->timestampTz('notificado_at')->nullable();
            $table->json('destinatarios_json')->nullable();
            $table->json('meta_json')->nullable();
            $table->timestampsTz();

            $table->foreign('campana_id')->references('id')->on('campanas')->nullOnDelete();
            $table->unique(['fecha', 'campana_id']);
            $table->index('fecha');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_send_registros');
    }
};
