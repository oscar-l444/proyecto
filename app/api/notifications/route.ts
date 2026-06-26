import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// Helper to authenticate user
async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado", status: 401 };
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile) {
    return { error: "Perfil de usuario no encontrado", status: 403 };
  }

  return { profile, user };
}

// GET: Obtener las notificaciones del usuario autenticado
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const onlyUnread = searchParams.get("unread") === "true";

    const whereClause: any = {
      userId: auth.user.id,
    };

    if (onlyUnread) {
      whereClause.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("[NOTIFICATIONS_GET_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// PUT: Marcar notificación(es) como leída(s)
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext();

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { id, all } = body;

    if (all === true) {
      // Marcar todas como leídas
      const updated = await prisma.notification.updateMany({
        where: {
          userId: auth.user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return NextResponse.json({
        message: "Todas las notificaciones marcadas como leídas",
        count: updated.count,
      });
    }

    if (!id) {
      return NextResponse.json({ error: "ID de notificación o parámetro 'all' requerido" }, { status: 400 });
    }

    // Marcar individualmente validando propiedad
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: auth.user.id,
      },
    });

    if (!notification) {
      return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error("[NOTIFICATIONS_PUT_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
