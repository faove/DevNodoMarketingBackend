<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_plantillas', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 60)->unique();
            $table->string('nombre', 160);
            $table->string('asunto_default', 255)->nullable();
            $table->text('html');
            $table->text('descripcion')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::table('campanas', function (Blueprint $table) {
            $table->foreignId('plantilla_id')
                ->nullable()
                ->after('producto_id')
                ->constrained('email_plantillas')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('campanas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plantilla_id');
        });

        Schema::dropIfExists('email_plantillas');
    }
};
