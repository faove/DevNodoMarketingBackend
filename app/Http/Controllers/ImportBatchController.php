<?php

namespace App\Http\Controllers;

use App\Models\ImportBatch;
use Inertia\Inertia;
use Inertia\Response;

class ImportBatchController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('imports/index', [
            'batches' => ImportBatch::query()
                ->orderByDesc('started_at')
                ->paginate(20),
        ]);
    }

    public function show(ImportBatch $import): Response
    {
        $import->loadCount('rows');

        return Inertia::render('imports/show', [
            'batch' => $import,
            'rows' => $import->rows()
                ->with('cliente:id,razon_social,nombre,apellido,email_principal')
                ->orderByDesc('id')
                ->paginate(30),
        ]);
    }
}
