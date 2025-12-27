"use client";

const featuredProducts = [
  { id: 1, title: "Storage" },
  { id: 2, title: "Software" },
  { id: 3, title: "Cables" },
  { id: 4, title: "Cases" },
  { id: 5, title: "Laptops" },
  { id: 6, title: "UPS" },
  { id: 7, title: "Gaming" },
];

export default function FeaturedProducts() {
  return (
    <section className="featured">
      <h2 className="heading">Featured Products</h2>

      <div className="container">
        {featuredProducts.map((item) => (
          <div key={item.id} className="card">
            <div className="icon" />
            <span className="label">{item.title}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .heading {
          font-size: clamp(28px, 4vw, 48px);
          font-weight: 800;
          margin-bottom: 30px;
        }

        .container {
          display: flex;
          gap: 40px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }

        .container::-webkit-scrollbar {
          display: none;
        }

        .card {
          min-width: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          scroll-snap-align: start;
          flex-shrink: 0;
        }

        .icon {
          width: 90px;
          height: 90px;
          border-radius: 24px;
          background: #e0e0e0;
        }

        .label {
          font-size: 18px;
          font-weight: 700;
          white-space: nowrap;
        }

        @media (min-width: 1024px) {
          .container {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            overflow: visible;
            gap: 50px;
          }

          .card {
            min-width: auto;
          }
        }
      `}</style>
    </section>
  );
}
