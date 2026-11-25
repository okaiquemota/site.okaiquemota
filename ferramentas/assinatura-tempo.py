#!/usr/bin/env python3
"""A assinatura que se escreve: gera assets/img/assinatura-tempo.png.

Cada ponto de tinta da assinatura (assets/img/assinatura.png) ganha o momento em que a caneta
passa por ele: quanto mais escuro, mais cedo. Na página, um filtro SVG mostra só os pontos cujo
momento já chegou, e a assinatura se escreve sem um traço revelar pedaço de outro onde eles
se cruzam.

O caminho da caneta (o meio de cada traço, na ordem e no sentido em que a assinatura é escrita)
e o ritmo (onde ela acelera e freia) estão aqui embaixo. Mudou a assinatura, a ordem ou o ritmo?
Ajuste e rode de novo:

    pip install numpy scipy pillow
    python3 ferramentas/assinatura-tempo.py

e confira se a DURACAO do fim deste arquivo é a mesma do dur="…" dos <animate> no index.html.
"""
import math
import os

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, median_filter
from scipy.spatial import cKDTree

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ENTRADA = os.path.join(RAIZ, 'assets/img/assinatura.png')
SAIDA = os.path.join(RAIZ, 'assets/img/assinatura-tempo.png')

# Os três traços (a caneta só levanta duas vezes), no sistema de coordenadas do assinatura.png
# (1091 × 1162). Cada um: o caminho do meio do traço, quando começa (s), quanto dura (s) e o
# ritmo: pontos (fração do tempo, fração do caminho) com a curva de aceleração de cada trecho.
FREIA = (0.45, 0, 0.55, 1)      # sai devagar, acelera e freia (as curvas fechadas)
TRACOS = [
    {   # 1. o laço e o K: começa na ponta direita do corte, vem até a ponta do laço, sobe até a
        #    ponta do braço, desce pela perna até embaixo e sobe a haste inteira
        'nome': 'laço e K',
        'caminho': "M1063 526 L1057 524 1046 524 1027 526 925 545 908 550 810 569 798 573 758 580 711 591 644 603 599 614 590 614 588 612 586 614 579 614 570 620 562 622 508 634 503 634 501 632 493 639 491 637 480 638 439 648 425 648 405 655 386 665 371 665 332 676 248 707 167 743 66 794 40 810 33 820 48 821 63 819 122 803 183 781 253 750 296 728 359 689 381 673 385 665 418 640 447 618 476 588 498 562 502 554 513 541 521 527 547 491 553 487 558 487 557 499 551 516 518 587 511 607 503 622 502 630 493 639 492 646 484 665 466 701 460 717 441 752 440 757 399 839 395 844 365 909 357 921 346 927 342 940 325 977 291 1044 282 1058 268 1090 266 1091 268 1090 282 1058 291 1044 325 977 347 926 346 920 348 910 367 859 377 824 383 812 384 804 391 787 403 746 408 720 413 708 422 670 423 653 424 649 426 649 425 647 428 634 433 619 433 606 438 580 447 495 452 425 454 379 454 281 446 198 442 184 439 156 431 129 424 96 407 48 408 43",
        'inicio': 0.0, 'duracao': 1.35,
        'ritmo': [(0, 0, FREIA), (0.28, 0.3114, FREIA), (0.49, 0.4952, FREIA),
                  (0.71, 0.6886, (0.4, 0, 0.75, 0.75)), (1, 1, None)],
    },
    {   # 2. o "l": sobe, faz a volta lá em cima e desce até o gancho
        'nome': 'l',
        'caminho': "M432 793 L441 817 445 822 449 822 458 817 485 790 510 759 534 722 539 717 548 701 549 696 557 691 560 691 562 688 571 665 578 636 583 625 583 620 589 608 589 601 594 590 594 585 596 586 603 582 607 575 637 486 660 377 663 349 659 345 659 337 668 285 666 290 659 344 653 349 630 422 612 509 595 572 594 590 589 601 588 612 585 615 583 625 578 636 568 674 560 691 560 703 538 778 536 795 531 801 520 843 493 923 489 930 475 978 465 1004 463 1016 431 1107 427 1126 428 1134 433 1135 439 1126",
        'inicio': 1.45, 'duracao': 0.5,
        'ritmo': [(0, 0, FREIA), (0.45, 0.4152, FREIA), (1, 1, None)],
    },
    {   # 3. o "am"
        'nome': 'am',
        'caminho': "M557 785 L555 781 568 760 571 749 593 717 606 703 617 702 620 706 622 728 618 767 620 770 625 770 628 769 645 751 687 695 712 670 716 674 713 678 712 686 725 685 726 682 724 686 712 686 712 681 716 674 713 672 716 674 712 681 713 687 710 693 703 701 694 706 690 715 667 745 664 753 674 750 692 737 697 738 697 745 700 750 708 750 712 748 733 732 753 709 767 697 771 696 774 698 774 712 777 713 789 708 804 693 812 692 815 696 819 713 824 717 837 713 845 706 861 697 868 697 881 707 896 705 915 688 924 673",
        'inicio': 1.98, 'duracao': 0.42,
        'ritmo': [(0, 0, (0.45, 0, 0.4, 1)), (1, 1, None)],
    },
]
TOTAL = 2.40            # quando a caneta termina (s)
MAXIMO = 250            # o fim vira o cinza 250 (sobra uma folga até 255)
DURACAO = TOTAL * 255 / MAXIMO   # o dur do <animate> no index.html (2.448s)


def bezier(p1x, p1y, p2x, p2y, x):
    """y da curva cubic-bezier(p1x, p1y, p2x, p2y) no x dado (igual à do CSS)."""
    lo, hi = 0.0, 1.0
    for _ in range(60):
        t = (lo + hi) / 2
        bx = 3 * (1 - t) ** 2 * t * p1x + 3 * (1 - t) * t ** 2 * p2x + t ** 3
        lo, hi = (t, hi) if bx < x else (lo, t)
    t = (lo + hi) / 2
    return 3 * (1 - t) ** 2 * t * p1y + 3 * (1 - t) * t ** 2 * p2y + t ** 3


def tempo_do_caminho(ritmo, f):
    """Em que fração do tempo do traço a caneta chega na fração f do caminho."""
    for (t0, f0, curva), (t1, f1, _) in zip(ritmo, ritmo[1:]):
        if f <= f1 or (t1, f1) == ritmo[-1][:2]:
            alvo = (f - f0) / (f1 - f0) if f1 > f0 else 1.0
            lo, hi = 0.0, 1.0
            for _ in range(50):
                m = (lo + hi) / 2
                lo, hi = (m, hi) if bezier(*curva, m) < alvo else (lo, m)
            return t0 + (t1 - t0) * (lo + hi) / 2
    return 1.0


def pontos(caminho):
    n = list(map(float, caminho.replace('M', ' ').replace('L', ' ').split()))
    return list(zip(n[::2], n[1::2]))


imagem = np.array(Image.open(ENTRADA).convert('RGBA'))
alfa = imagem[..., 3]
# a meia grossura da tinta em cada ponto (pra saber até onde vai a faixa de cada traço)
grossura = distance_transform_edt(alfa > 127)

amostras, tempos, raios = [], [], []
for traco in TRACOS:
    p = pontos(traco['caminho'])
    trechos = [math.dist(a, b) for a, b in zip(p, p[1:])]
    total = sum(trechos)
    andado = 0.0
    ini = len(amostras)
    for (a, b), d in zip(zip(p, p[1:]), trechos):
        passos = max(1, int(d * 2))        # um ponto a cada meio pixel
        for i in range(passos):
            u = i / passos
            amostras.append((a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u))
            f = (andado + d * u) / total
            tempos.append(traco['inicio'] + traco['duracao'] * tempo_do_caminho(traco['ritmo'], f))
        andado += d
    amostras.append(p[-1])
    tempos.append(traco['inicio'] + traco['duracao'])
    # a grossura do traço em cada ponto do caminho; nos cruzamentos a tinta engorda, então vale
    # a mediana dos 20px em volta (a grossura do traço mesmo, sem o outro que cruza)
    xy = np.round(np.array(amostras[ini:])).astype(int)
    r = grossura[np.clip(xy[:, 1], 0, alfa.shape[0] - 1), np.clip(xy[:, 0], 0, alfa.shape[1] - 1)]
    raios.extend(median_filter(r, size=81, mode='nearest'))

amostras = np.array(amostras)
tempos = np.array(tempos)
raios = np.array(raios)
arvore = cKDTree(amostras)

ys, xs = np.nonzero(alfa)
# cada ponto de tinta aparece quando a caneta passa pela primeira vez por um traço que o cobre:
# num cruzamento, o traço que vem antes passa inteiro e o outro chega depois, sem riscos soltos.
# Onde nenhum cobre (a beirada irregular do lápis), vale o meio de traço mais perto.
dist, idx = arvore.query(np.c_[xs, ys], k=48)
cobre = dist <= raios[idx] + 2.0
momento = np.where(cobre, tempos[idx], np.inf).min(axis=1)
sem = ~np.isfinite(momento)
perto = dist[sem] <= dist[sem][:, :1] + 1.0
momento[sem] = np.where(perto, tempos[idx[sem]], np.inf).min(axis=1)

cinza = np.clip(np.round(momento / TOTAL * MAXIMO), 0, MAXIMO).astype(np.uint8)
saida = np.zeros_like(imagem)
saida[ys, xs, 0] = saida[ys, xs, 1] = saida[ys, xs, 2] = cinza
saida[..., 3] = alfa
Image.fromarray(saida, 'RGBA').save(SAIDA, optimize=True)
print('ok: %s (dur do <animate> = %.3fs)' % (os.path.relpath(SAIDA, RAIZ), DURACAO))
