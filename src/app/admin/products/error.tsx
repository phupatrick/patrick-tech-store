"use client";

import Link from "next/link";
import { useEffect } from "react";

type AdminProductsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminProductsError({ error, reset }: AdminProductsErrorProps) {
  useEffect(() => {
    console.error("[admin/products] route error", error);
  }, [error]);

  return (
    <main className="page-stack">
      <section className="surface page-stack">
        <p className="eyebrow">Admin products</p>
        <h2 className="page-title">Không thể mở khu quản lý sản phẩm</h2>
        <p className="lead">
          Trang quản lý sản phẩm vừa gặp lỗi trên máy chủ. Bạn có thể thử lại hoặc quay về danh sách sản phẩm để tiếp
          tục thao tác.
        </p>
        {error.digest ? <p className="muted">Digest: {error.digest}</p> : null}
        <div className="row row-actions">
          <button type="button" className="button button-primary" onClick={() => reset()}>
            Thử lại
          </button>
          <Link href="/admin/products" className="button">
            Về danh sách sản phẩm
          </Link>
        </div>
      </section>
    </main>
  );
}
