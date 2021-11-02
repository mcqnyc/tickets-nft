;; use the SIP009 interface
(impl-trait .tickets-nft-trait.tickets-nft-trait)

;; constants
(define-constant contract-owner tx-sender)

;; errors
(define-constant err-token-max-reached (err u101))
(define-constant err-use-by-block-reached (err u102))
(define-constant err-use-by-block-not-reached (err u103))
(define-constant err-nft-exists-already (err u104))
(define-constant err-stx-transfer u105)
(define-constant err-not-token-owner (err u106))
(define-constant err-invalid-caller (err u107))


;; define a new NFT
(define-non-fungible-token TKT uint)

;; data
(define-data-var max-token-id uint u100)
(define-data-var last-token-id uint u0)
(define-data-var use-by-block uint u10)
(define-data-var price uint u100)

;; public functions
(define-read-only (get-price)
    (var-get price)
)

;; Claim a new NFT
(define-public (claim)
    (begin
        (asserts! (> (var-get max-token-id) (var-get last-token-id)) err-token-max-reached)
        (asserts! (< block-height (var-get use-by-block)) err-use-by-block-reached)
        (try! (stx-transfer? (var-get price) tx-sender (as-contract tx-sender)))
        (mint tx-sender)
    )
)

;; SIP009: Transfer token to a specified principal
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) err-not-token-owner)
        (nft-transfer? TKT token-id sender recipient)
    )
)

;; SIP009: Get the owner of the specified token ID
(define-read-only (get-owner (token-id uint))
    (ok (nft-get-owner? TKT token-id)))

;; SIP009: Get the last token ID
(define-read-only (get-last-token-id)
    (ok (var-get last-token-id)))

;; SIP009: Get the token URI. You can set it to any other URI
(define-read-only (get-token-uri (token-id uint))
    (ok (some "https://docs.stacks.co")))

;; Internal - Mint new NFT
(define-private (mint (new-owner principal))
    (let ((next-id (+ u1 (var-get last-token-id))))
      (match (nft-mint? TKT next-id new-owner)
        success
          (begin
            (var-set last-token-id next-id)
            (ok true))
        error err-nft-exists-already)
    )
)
