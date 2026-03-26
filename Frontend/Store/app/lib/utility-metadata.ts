import type { Metadata } from "next";
import { buildPageMetadata, resolveStoreLocale, type StoreLocale } from "./seo";

type UtilityPageKey =
  | "account"
  | "cart"
  | "chat"
  | "checkout"
  | "forgot-password"
  | "login"
  | "order"
  | "order-tracking"
  | "register"
  | "reset-password"
  | "locale-home";

const UTILITY_COPY: Record<
  StoreLocale,
  Record<UtilityPageKey, { title: string; description: string }>
> = {
  es: {
    account: {
      title: "Mi cuenta",
      description:
        "Gestiona tu perfil, pedidos, facturas y datos guardados en tu cuenta de TheNexuStore.",
    },
    cart: {
      title: "Carrito",
      description:
        "Revisa productos, descuentos y totales en tu carrito de compra de TheNexuStore.",
    },
    chat: {
      title: "Chat de soporte",
      description:
        "Habla con soporte y sigue tus conversaciones de atención al cliente en TheNexuStore.",
    },
    checkout: {
      title: "Finalizar compra",
      description:
        "Completa tu pedido de forma segura con envío, impuestos y pago online en TheNexuStore.",
    },
    "forgot-password": {
      title: "Recuperar contraseña",
      description:
        "Solicita un enlace seguro para recuperar el acceso a tu cuenta de TheNexuStore.",
    },
    login: {
      title: "Iniciar sesión",
      description:
        "Accede a tu cuenta de TheNexuStore para gestionar pedidos, carrito y datos personales.",
    },
    order: {
      title: "Detalle del pedido",
      description:
        "Consulta el resumen y estado de un pedido realizado en TheNexuStore.",
    },
    "order-tracking": {
      title: "Seguimiento del pedido",
      description:
        "Sigue el estado y los hitos de entrega de tu pedido de TheNexuStore.",
    },
    register: {
      title: "Crear cuenta",
      description:
        "Crea tu cuenta de TheNexuStore para comprar, guardar datos y seguir pedidos.",
    },
    "reset-password": {
      title: "Restablecer contraseña",
      description:
        "Establece una nueva contraseña para recuperar el acceso seguro a tu cuenta de TheNexuStore.",
    },
    "locale-home": {
      title: "Redirigiendo a la tienda",
      description:
        "Redirección segura a la portada de TheNexuStore en tu idioma.",
    },
  },
  en: {
    account: {
      title: "My account",
      description:
        "Manage your profile, orders, invoices, and saved details in your TheNexuStore account.",
    },
    cart: {
      title: "Cart",
      description:
        "Review products, discounts, and totals in your TheNexuStore shopping cart.",
    },
    chat: {
      title: "Support chat",
      description:
        "Talk to support and follow your customer service conversations on TheNexuStore.",
    },
    checkout: {
      title: "Checkout",
      description:
        "Complete your order securely with shipping, taxes, and online payment on TheNexuStore.",
    },
    "forgot-password": {
      title: "Recover password",
      description:
        "Request a secure link to recover access to your TheNexuStore account.",
    },
    login: {
      title: "Sign in",
      description:
        "Access your TheNexuStore account to manage orders, cart, and personal details.",
    },
    order: {
      title: "Order details",
      description:
        "Review the summary and status of a TheNexuStore order.",
    },
    "order-tracking": {
      title: "Track order",
      description:
        "Follow delivery status and milestones for your TheNexuStore order.",
    },
    register: {
      title: "Create account",
      description:
        "Create your TheNexuStore account to shop faster, save details, and track orders.",
    },
    "reset-password": {
      title: "Reset password",
      description:
        "Set a new password to securely recover access to your TheNexuStore account.",
    },
    "locale-home": {
      title: "Redirecting to the store",
      description:
        "Secure redirect to the localized TheNexuStore storefront.",
    },
  },
};

export function getUtilityPageMetadata({
  key,
  locale,
  routePath,
}: {
  key: UtilityPageKey;
  locale?: string;
  routePath: string;
}): Metadata {
  const resolvedLocale = resolveStoreLocale(locale);
  const copy = UTILITY_COPY[resolvedLocale][key];

  return buildPageMetadata({
    locale: resolvedLocale,
    routePath,
    title: `${copy.title} | TheNexuStore`,
    description: copy.description,
    indexable: false,
  });
}
