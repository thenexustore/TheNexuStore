import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      nav: {
        engineering: "ENGINEERING",
        store: "PRO_STORE",
        system: "SYSTEM_MENU_V2",
      },
      hero: {
        badge: "Established 2009 / Nexus SP Solutions",
        titleMain: "WE ARCHITECT",
        titleItalic: "Resilient",
        titleEnd: "NETWORKS.",
        description:
          "Standard ICT is a commodity. We provide the specialized skeletal infrastructure that keeps enterprise 5G and Cloud systems alive.",
        cta: "BUILD WITH US",
        secondaryCta: "View Capabilities",
        expertiseTitle: "Expertise",
        expertise: [
          "5G Infrastructure",
          "Hybrid Cloud",
          "Cybersecurity",
          "IT Audit",
        ],
      },
      services: {
        title: "SPECIALIZED",
        subtitle: "Capabilities",
        items: {
          nt01: {
            title: "5G & Network Architecture",
            desc: "Enterprise-grade connectivity for high-density environments.",
          },
          cl05: {
            title: "Cloud Systems & Hybrid",
            desc: "Scalable virtualization and high-availability cloud clusters.",
          },
          sec09: {
            title: "Cybersecurity & Audit",
            desc: "Military-grade encryption and real-time threat detection.",
          },
          sys02: {
            title: "Enterprise IT Ecosystems",
            desc: "Core infrastructure design for modern workforces.",
          },
          int04: {
            title: "Intelligent Integration",
            desc: "Seamless API orchestration and legacy system bridge.",
          },
          sup07: {
            title: "Hardware Procurement",
            desc: "Direct-tier sourcing for specialized server hardware.",
          },
        },
      },
      about: {
        badge: "THE FIRM",
        titleMain: "BEYOND STANDARD",
        titleItalic: "Infrastructure.",
        p1: "Based in Ceuta, Spain, <1>Nexus SP</1> has spent 15 years reinforcing the digital backbone of the Mediterranean’s enterprise sector.",
        p2: "We don't just 'install' systems. We engineer resilient environments where data moves securely and hardware scales without friction.",
        cta: "View Operations Portfolio",
        stats: {
          years: "YEARS EXP",
          nodes: "NODES MANAGED",
          projects: "PROJECTS",
          uptime: "UPTIME",
        },
        values: {
          excellence: {
            title: "EXCELLENCE",
            desc: "Precision-grade technical execution.",
          },
          partnership: {
            title: "PARTNERSHIP",
            desc: "Co-architecting your digital future.",
          },
          innovation: {
            title: "INNOVATION",
            desc: "Next-gen infrastructure readiness.",
          },
          growth: {
            title: "GROWTH",
            desc: "Scalable systems built for longevity.",
          },
        },
      },
      store: {
        loading: "LOADING_SYSTEM...",
        titleMain: "PRO",
        titleItalic: "Inventory",
        subtitle: "Direct enterprise hardware & software sourcing",
        searchPlaceholder: "SEARCH_LOG_ID...",
        filters: {
          all: "[ ALL_UNITS ]",
          hardware: "HARDWARE",
          software: "SOFTWARE",
        },
        unitPrice: "UNIT_PRICE",
        empty: "No assets match current query...",
        idLabel: "ID",
      },
      cart: {
        emptyTitle: "Manifest",
        emptyItalic: "Empty",
        emptySubtitle: "No active procurement detected",
        emptyCta: "Return to Store",
        titleMain: "LOGISTIC",
        titleItalic: "Manifest",
        sessionActive: "Session_Active",
        unitsReady: "Units_Ready",
        continueSourcing: "Continue_Sourcing",
        partNo: "PART_NO",
        purgeItem: "Purge_Item",
        summaryTitle: "[ SUMMARY_REPORT ]",
        subtotal: "SUBTOTAL_UNITS",
        logisticsFee: "LOGISTICS_FEE",
        logisticsCredit: "0.00 (CREDIT)",
        totalValuation: "TOTAL_VALUATION",
        checkout: "Initialize_Checkout",
        terminate: "Terminate_All_Orders",
        guarantees: [
          "Enterprise-grade encryption",
          "30-day global guarantee",
          "Priority 24h dispatch",
        ],
      },
      contact: {
        badge: "Direct_Communication_Line",
        titleMain: "INITIATE",
        titleItalic: "Contact.",
        description:
          "Secure inquiry channel for infrastructure audits, 5G deployment, and enterprise system architecture.",
        status: "Signal_Status: Ready",
        form: {
          name: "OPERATOR_NAME",
          email: "SIGNAL_RETURN",
          company: "ORGANIZATION",
          sector: "SECTOR_TYPE",
          sectorPlaceholder: "Select sector...",
          message: "MESSAGE_PAYLOAD",
          messagePlaceholder: "Define requirements...",
          submit: "EXECUTE_SEND",
          submitting: "TRANSMISSION_COMPLETE",
          success:
            "> ACKNOWLEDGE: Message has been queued for processing. Our engineers will respond shortly.",
        },
        sectors: {
          infra: "Network Infra",
          cyber: "Cybersecurity",
          cloud: "Cloud Solutions",
        },
      },
      footer: {
        tagline:
          "Precision-engineered ICT skeletal infrastructure for the modern enterprise.",
        systems: "[ SYSTEMS ]",
        directory: "[ DIRECTORY ]",
        terminal: "[ TERMINAL ]",
        links: { about: "About", services: "Services", contact: "Contact" },
        legal: ["Privacy_Log", "Terms_Conf", "Cookie_Set"],
      },
    },
  },
  es: {
    translation: {
      nav: {
        engineering: "INGENIERÍA",
        store: "TIENDA_PRO",
        system: "MENÚ_SISTEMA_V2",
      },
      hero: {
        badge: "Establecido en 2009 / Nexus SP Solutions",
        titleMain: "ARQUITECTAMOS",
        titleItalic: "Redes",
        titleEnd: "RESILIENTES.",
        description:
          "Las TIC estándar son una mercancía. Proporcionamos la infraestructura esquelética especializada que mantiene vivos los sistemas 5G y la Nube empresarial.",
        cta: "CONSTRUYE con NOSOTROS",
        secondaryCta: "Ver Capacidades",
        expertiseTitle: "Especialidades",
        expertise: [
          "Infraestructura 5G",
          "Nube Híbrida",
          "Ciberseguridad",
          "Auditoría TI",
        ],
      },
      services: {
        title: "CAPACIDADES",
        subtitle: "Especializadas",
        items: {
          nt01: {
            title: "5G y Arquitectura de Red",
            desc: "Conectividad de grado empresarial para entornos de alta densidad.",
          },
          cl05: {
            title: "Sistemas Cloud e Híbridos",
            desc: "Virtualización escalable y clústeres de nube de alta disponibilidad.",
          },
          sec09: {
            title: "Ciberseguridad y Auditoría",
            desc: "Cifrado de grado militar y detección de amenazas en tiempo real.",
          },
          sys02: {
            title: "Ecosistemas TI Empresariales",
            desc: "Diseño de infraestructura central para fuerzas de trabajo modernas.",
          },
          int04: {
            title: "Integración Inteligente",
            desc: "Orquestación de APIs sin fisuras y puente para sistemas legados.",
          },
          sup07: {
            title: "Adquisición de Hardware",
            desc: "Abastecimiento directo para hardware de servidor especializado.",
          },
        },
      },
      about: {
        badge: "LA FIRMA",
        titleMain: "MÁS ALLÁ de la",
        titleItalic: "Infraestructura.",
        p1: "Con sede en Ceuta, España, <1>Nexus SP</1> ha pasado 15 años reforzando la columna vertebral digital del sector empresarial del Mediterráneo.",
        p2: "No solo 'instalamos' sistemas. Diseñamos entornos resilientes donde los datos se mueven de forma segura y el hardware escala sin fricciones.",
        cta: "Ver Portafolio de Operaciones",
        stats: {
          years: "AÑOS EXP",
          nodes: "NODOS GESTIONADOS",
          projects: "PROYECTOS",
          uptime: "TIEMPO ACTIVIDAD",
        },
        values: {
          excellence: {
            title: "EXCELENCIA",
            desc: "Ejecución técnica de precisión.",
          },
          partnership: {
            title: "COLABORACIÓN",
            desc: "Co-arquitectando su futuro digital.",
          },
          innovation: {
            title: "INNOVACIÓN",
            desc: "Preparación para infraestructura de próxima generación.",
          },
          growth: {
            title: "CRECIMIENTO",
            desc: "Sistemas escalables construidos para la longevidad.",
          },
        },
      },
      store: {
        loading: "CARGANDO_SISTEMA...",
        titleMain: "INVENTARIO",
        titleItalic: "Profesional",
        subtitle: "Suministro directo de hardware y software empresarial",
        searchPlaceholder: "BUSCAR_POR_LOG_ID...",
        filters: {
          all: "[ TODAS_LAS_UNIDADES ]",
          hardware: "HARDWARE",
          software: "SOFTWARE",
        },
        unitPrice: "PRECIO_UNITARIO",
        empty: "No hay activos que coincidan con la consulta...",
        idLabel: "ID",
      },
      cart: {
        emptyTitle: "Manifiesto",
        emptyItalic: "Vacío",
        emptySubtitle: "No se detecta adquisición activa",
        emptyCta: "Volver a la Tienda",
        titleMain: "LOGÍSTICA de",
        titleItalic: "Manifiesto",
        sessionActive: "Sesión_Activa",
        unitsReady: "Unidades_Listas",
        continueSourcing: "Continuar_Abastecimiento",
        partNo: "PIEZA_NO",
        purgeItem: "Purgar_Elemento",
        summaryTitle: "[ INFORME_RESUMEN ]",
        subtotal: "SUBTOTAL_UNIDADES",
        logisticsFee: "TASA_LOGÍSTICA",
        logisticsCredit: "0.00 (CRÉDITO)",
        totalValuation: "VALORACIÓN_TOTAL",
        checkout: "Iniciar_Pago",
        terminate: "Terminar_Todos_los_Pedidos",
        guarantees: [
          "Cifrado de grado empresarial",
          "Garantía global de 30 días",
          "Envío prioritario 24h",
        ],
      },
      contact: {
        badge: "Línea_de_Comunicación_Directa",
        titleMain: "INICIAR",
        titleItalic: "Contacto.",
        description:
          "Canal seguro de consultas para auditorías de infraestructura, despliegue de 5G y arquitectura de sistemas empresariales.",
        status: "Estado_Señal: Lista",
        form: {
          name: "NOMBRE_OPERADOR",
          email: "RETORNO_SEÑAL",
          company: "ORGANIZACIÓN",
          sector: "TIPO_SECTOR",
          sectorPlaceholder: "Seleccionar sector...",
          message: "CARGA_MENSAJE",
          messagePlaceholder: "Definir requerimientos...",
          submit: "EJECUTAR_ENVÍO",
          submitting: "TRANSMISIÓN_COMPLETA",
          success:
            "> RECONOCIMIENTO: Mensaje en cola para procesamiento. Nuestros ingenieros responderán en breve.",
        },
        sectors: {
          infra: "Infra de Red",
          cyber: "Ciberseguridad",
          cloud: "Soluciones Cloud",
        },
      },
      footer: {
        tagline:
          "Infraestructura esquelética TIC diseñada con precisión para la empresa moderna.",
        systems: "[ SISTEMAS ]",
        directory: "[ DIRECTORIO ]",
        terminal: "[ TERMINAL ]",
        links: {
          about: "Sobre Nosotros",
          services: "Servicios",
          contact: "Contacto",
        },
        legal: ["Privacidad_Log", "Términos_Conf", "Cookies_Set"],
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    debug: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
