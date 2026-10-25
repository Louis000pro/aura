# Cours nutrition · lot 1 (quinze cours) · carnet de recherche

Vérifié le 25 octobre 2026. Chaque affirmation des quinze cours est listée ici
avec ses sources et son niveau de preuve. Un autre agent doit pouvoir tout
revérifier à partir de ce carnet, sans repasser par la conversation. La règle
et les niveaux sont ceux du lot 0 (`carnet-lot-0.md`) :

- au moins deux sources fiables et indépendantes par affirmation ;
- une source n'entre ici que si son texte a été lu (page officielle, texte de
  loi, résumé original via Europe PMC, texte complet) ;
- **solide** : recommandations officielles concordantes, texte de loi, ou
  méta-analyse d'essais contrôlés ; **probable** : essais cohérents mais peu
  nombreux, ou une seule source officielle sur un point précis ; **débattu** :
  résultats contradictoires ou seulement des études d'observation.

## Ce qui n'a pas pu être lu ce jour

- **Table Ciqual 2025 (Anses)** : toujours en maintenance (HTTP 503). Les
  valeurs Ciqual sont celles de **Ciqual 2013**, lues sur le miroir
  informationsnutritionnelles.fr (licence ouverte de l'Anses), recoupées quand
  c'était possible avec USDA FoodData Central. **À recouper avec Ciqual 2025
  dès son retour.** Quand les deux tables divergent (fibres des légumes secs),
  le cours donne une fourchette.
- **Pages de l'Anses sur les glucides et les fibres** : 404. Remplacées par le
  rapport de l'Anses de 2016 sur les repères du PNNS (PDF lu).
- **mangerbouger.fr** : en maintenance. Remplacé par le rapport de Santé
  publique France de 2019 (PDF lu).
- **Recherche de l'EFSA** : vérification anti-robot, non contournée. Les avis
  de l'EFSA ont été lus via sa page thématique et Europe PMC (EFSA Journal).
- **Fineli (Finlande)** et la base suisse des valeurs nutritives : non
  consultées.

## Le lot et les anciens cours

Le lot 1 remplace quatre des cinq anciens cours nutrition de
`src/lib/adviceArticles.ts`, réécrits à partir de zéro selon la règle :

- « Les protéines, sans vivre avec une calculette » (`conseil-proteines`)
  devient **« Les protéines : combien par jour, et comment les répartir »** ;
- « Les glucides ne sont pas l’ennemi de ta séance » (`conseil-glucides`)
  devient **« Combien de glucides quand tu t’entraînes »** ;
- « Boire assez, sans faire de ta gourde un devoir » (`conseil-hydratation`)
  devient **« Combien boire quand tu fais du sport »** ;
- « Créatine : le solide et le marketing » (`conseil-creatine`) devient
  **« Créatine : ce que disent les études »**.

Après la première relecture (25 octobre), Louis a demandé que les encadrés de
fin restent exceptionnels : « À retenir » partout, l'exemple concret, « Ce
qu'on ne sait pas encore » et « Essaie ça » seulement là où ils apportent
quelque chose. Il en reste quatre (cours 2, 3, 4 et 7). Les affirmations qui
ne vivaient que dans les encadrés retirés ont quitté ce carnet ; les nuances
utiles sont passées dans le corps des cours (fibres, protéines, balance,
vitamine D, compléments, créatine).

Le cinquième, « Perdre du gras sans déclarer la guerre à ton corps »
(`conseil-perdre-gras`), **n'est pas réécrit seul** : le dossier gratuit du
lot 0 « Perdre du poids : comment ça marche » couvre déjà le déficit, le
rythme, le palier, les protéines et la musculation, et le nouveau cours
« Pourquoi la balance bouge chaque jour » prend le reste. Les cinq anciens
sortent de « Conseils & progresser » à l'intégration.

## Une correction pour le lot 0

« Que manger après une séance » dit : « un yaourt grec nature de 150 g, qui
apporte environ 15 g de protéines ». Le chiffre vient de la table américaine
(USDA 170903, yaourt grec égoutté, environ 10 g pour 100 g). Ciqual 2013 n'a
pas de yaourt « grec » : le yaourt au lait entier nature y apporte **4,04 g**
pour 100 g, et la spécialité laitière ou le yaourt au lait entier avec crème
**3,8 g**. Un yaourt vendu « à la grecque » en France peut donc apporter bien
moins que 15 g pour 150 g, selon le produit. Proposition, soumise à Louis avec
le lot 1 : « prends en rentrant 200 g de fromage blanc, qui apportent environ
15 g de protéines » (Ciqual 2013, fromage blanc nature ou aux fruits, aliment
moyen : 7,54 g pour 100 g), et dans « Essaie ça », « un yaourt grec » devient
« du fromage blanc ». Fichiers à changer à l'intégration : `temoins.md`,
`carnet-lot-0.md`, `src/lib/textesCours/apres-seance.ts`.

---

## 1. « Protéines, glucides, lipides : à quoi sert chacun » (cours)

| Affirmation | Sources lues | Niveau |
|---|---|---|
| Les protéines construisent et renouvellent les muscles, la peau, les cheveux, les ongles et les os, et servent à fabriquer enzymes, hormones, hémoglobine et anticorps. | Anses, « Les protéines » (page lue). ISSN, protéines et exercice (Jäger 2017), cohérent sur le rôle du muscle. | solide |
| 20 acides aminés, dont 9 indispensables (le corps ne les fabrique pas). | Anses, « Les protéines ». ISSN 2017 (acides aminés indispensables, leucine). | solide |
| Les protéines végétales sont un peu moins complètes (céréales pauvres en lysine, légumes secs en acides aminés soufrés) ; en France, pas besoin d'associer systématiquement céréales et légumes secs à chaque repas. | Anses, « Les protéines » (« pas à craindre d'insuffisance d'apport justifiant de recommander une combinaison systématique »). van Vliet, Burd et van Loon, J Nutr 2015 (lu pour le lot 0 : moins d'acides aminés indispensables dans les protéines végétales). Santé publique France 2019 (légumes secs et féculents dans une alimentation variée). | probable (une source sur le point précis) |
| Référence en protéines : 0,83 g par kilo et par jour pour un adulte en bonne santé. | Anses, « Les protéines ». Hudson et al., Adv Nutr 2020 (0,8 g/kg/j comme apport minimal recommandé, lu pour le lot 0). | solide |
| L'amidon (pain, pâtes, riz, pommes de terre, légumes secs) est un glucide complexe, digéré et absorbé surtout sous forme de glucose. | Anses, « Les sucres dans l'alimentation ». Anses 2016 (glucides complexes à privilégier). | solide |
| Les glucides sont un carburant majeur du cerveau et des muscles, qui en gardent une réserve limitée, le glycogène. | Position commune Academy of Nutrition and Dietetics, Dietitians of Canada et ACSM (Thomas 2016). ISSN, recommandations de nutrition sportive (Kerksick 2018). | solide |
| Glucides : 40 à 55 % de l'énergie, en privilégiant les glucides complexes ; sucres : pas plus de 100 g par jour (hors sucres du lait) ; OMS : sucres libres sous 10 % de l'énergie, si possible 5 %. | Anses 2016. Anses, « Les sucres dans l'alimentation ». OMS, recommandation sur les sucres (2015, lue pour le lot 0). | solide |
| Les lipides stockent l'énergie et forment les membranes des cellules ; le cholestérol sert à fabriquer des hormones ; certains acides gras (oméga 3 et oméga 6) sont indispensables. | Anses, « Les lipides » (page lue). Anses 2016 (repères lipides). | solide |
| Lipides : 35 à 40 % de l'énergie ; environ 43 % des adultes en France dépassent ce repère. | Anses, « Les lipides ». Anses 2016. | solide |
| Huiles de colza, de noix et d'olive ; poisson deux fois par semaine, dont un poisson gras (sardine, maquereau, hareng, saumon). | Santé publique France 2019. Anses, « Vitamine D » (deux portions de poisson par semaine dont une de poisson gras). | solide |
| 4 kcal par gramme de protéines et de glucides, 9 pour les lipides, 7 pour l'alcool, 2 pour les fibres. | Règlement (UE) n° 1169/2011, annexe XIV (coefficients de l'étiquetage). | solide (texte de loi) |
| Les pourcentages des étiquettes se calculent sur un adulte de référence : 2 000 kcal, 50 g de protéines, 260 g de glucides dont 90 g de sucres, 70 g de graisses dont 20 g de saturées, 6 g de sel. | Règlement (UE) n° 1169/2011, annexe XIII, partie B. | solide (texte de loi) |
| Les besoins réels dépendent de l'âge, du gabarit et de l'activité. | Harvard, « Healthy Eating Plate ». Position commune 2016 (besoins selon la charge d'entraînement). | solide |

Ce que le cours ne dit pas, exprès : « les glucides font grossir », « le gras
est mauvais », un pourcentage idéal, une cible de calories personnelle.

---

## 2. « Les fibres : à quoi elles servent et où les trouver » (cours)

| Affirmation | Sources lues | Niveau |
|---|---|---|
| Les fibres ne sont pas digérées dans l'intestin grêle : elles continuent jusqu'au côlon. | Anses 2016 (définition : non hydrolysées par les enzymes de l'intestin grêle). British Dietetic Association, « Fibre » (page lue). | solide |
| 30 g de fibres par jour pour un adulte. | Anses 2016 (apport satisfaisant de 30 g par jour). NHS, « How to get more fibre into your diet » (page revue le 2 mars 2026). | solide |
| Au Royaume-Uni, les adultes en mangent environ 20 g par jour ; en France, même des menus optimisés peinent à atteindre 30 g chez les femmes. | NHS (moyenne d'environ 20 g). Anses 2016 (menus optimisés, tolérance à 25 g chez les femmes). | probable (deux pays, deux mesures différentes) |
| Une alimentation riche en fibres est liée à moins de maladies cardiovasculaires, d'AVC, de diabète de type 2 et de cancer colorectal, et aide le transit. | NHS. Reynolds et al., The Lancet 2019 (185 cohortes, 58 essais : 15 à 30 % de mortalité et d'incidence en moins entre les plus gros et les plus petits mangeurs de fibres). Anses 2016 (risque réduit dès 25 g, plus nettement à 30 g, y compris cancer du sein). | solide pour l'association, débattu pour la cause (études d'observation) |
| Le bénéfice le plus marqué apparaît vers 25 à 29 g par jour ; dans les essais, les fibres font baisser le poids, la tension systolique et le cholestérol total. | Reynolds 2019 (certitude jugée modérée par les auteurs ; essais de compléments exclus). Anses 2016 (seuils 25 et 30 g), cohérent. | probable |
| Sources : céréales complètes, légumes secs, légumes, fruits, fruits à coque ; au moins un féculent complet par jour, légumes secs au moins deux fois par semaine. | NHS (liste des sources). Santé publique France 2019. | solide |
| Pain complet : 5,6 g de fibres pour 100 g ; lentilles cuites : 4,2 g (Ciqual) à 7,9 g (USDA) ; pois chiches cuits : 4,8 à 7,6 g ; haricots blancs cuits : 6,3 g ; riz blanc cuit : 0,3 g. | Ciqual 2013 (pain complet, lentilles, pois chiches, haricots blancs). USDA FoodData Central (lentilles, pois chiches, riz blanc). | probable (tables divergentes : le cours donne des fourchettes ; à recouper avec Ciqual 2025) |
| Une journée à environ 30 g : deux tartines de pain complet au beurre de cacahuète et une orange (8,3 g), des spaghetti complets à la sauce lentilles et tomates (11 g), du poulet avec une pomme de terre au four avec la peau, des carottes et des haricots verts (11,2 g). | NHS (exemple de journée donné par la page). | probable (une source, exemple chiffré par elle) |
| « Source de fibres » : au moins 3 g pour 100 g ; « riche en fibres » : au moins 6 g pour 100 g. | Règlement (CE) n° 1924/2006, annexe (allégations nutritionnelles, lu dans EUR-Lex). NHS (« high fibre » = 6 g ou plus pour 100 g). | solide (texte de loi) |
| Augmenter progressivement limite ballonnements et gaz ; boire en même temps ; prudence avec un intestin sensible (syndrome de l'intestin irritable). | British Dietetic Association, « Fibre ». | probable (une source, règle de prudence) |

Ce que le cours ne dit pas, exprès : « les fibres font maigrir », « les
fibres préviennent le cancer », aucun complément de fibres conseillé.

---

## 3. « Que manger avant une séance » (cours)

| Affirmation | Sources lues | Niveau |
|---|---|---|
| Manger avant améliore l'endurance prolongée, pas les efforts plus courts. | Aird, Davies et Carson, Scand J Med Sci Sports 2018 (méta-analyse de 46 études : p = 0,012 pour les efforts prolongés, p = 0,687 pour les plus courts). Position commune 2016 (1 à 4 g de glucides par kilo dans les 1 à 4 h avant améliorent les efforts prolongés). | solide |
| En musculation, après un repas normal, ajouter des glucides n'améliore pas une séance de moins d'une dizaine de séries par groupe musculaire. | Henselmans et al., Nutrients 2022 (revue de 49 études). Escobar et al., Br J Nutr 2016 (épuisement du glycogène peu probable en musculation). | probable |
| Pendant l'effort, les glucides aident surtout au-delà d'une heure et demie environ ; effet incertain à 60-75 min ; sous une heure, l'eau suffit. | Kerksick et al., ISSN 2018. Position commune 2016 (rôle métabolique au-delà de 60-90 min). McDermott et al., NATA 2017 (moins d'une heure : de l'eau). | solide |
| 30 à 60 g de glucides par heure pour les efforts longs, jusqu'à 90 g au-delà de 2 h 30. | Position commune 2016. Burke et al., J Sports Sci 2011 (consensus du CIO). | solide |
| Près de la séance, des aliments pauvres en graisses et en fibres, avec peu ou modérément de protéines, causent moins de troubles digestifs. | Position commune 2016. | probable (une source) |
| Les glucides d'avant reconstituent le glycogène du foie, entamé pendant la nuit. | Position commune 2016. | probable (une source) |
| Chacun choisit d'après son expérience ce qui lui convient avant l'effort. | Position commune 2016. NATA 2017 (préférences individuelles). | solide |
| Inutile de boire beaucoup juste avant : arriver hydraté suffit. | NATA 2017. | probable (une source) |
| À jeun, on utilise plus de graisses pendant et après l'effort ; l'intérêt à long terme reste à confirmer. | Aird 2018 (acides gras libres plus élevés après l'effort à jeun ; adaptations à confirmer). | débattu (bloc « Ce qu'on ne sait pas encore ») |

Ce que le cours ne dit pas, exprès : « ne jamais s'entraîner à jeun »,
« l'entraînement à jeun brûle plus de graisse », un horaire universel.

---

## 4. « Les protéines : combien par jour, et comment les répartir » (cours)

Réécriture de « Les protéines, sans vivre avec une calculette ».

| Affirmation | Sources lues | Niveau |
|---|---|---|
| 0,83 g par kilo et par jour pour un adulte en bonne santé. | Anses, « Les protéines ». Hudson et al., Adv Nutr 2020 (0,8 g/kg/j comme apport minimal recommandé, lu pour le lot 0). | solide |
| Pour 30 à 40 minutes de sport trois fois par semaine, 0,8 à 1,2 g par kilo, avec une alimentation normale. | Kerksick, ISSN 2018. Position commune 2016 (besoins couverts par l'alimentation). | probable |
| Musculation régulière : 1,2 à 2 g par kilo et par jour (ISSN : 1,4 à 2). | Position commune 2016. Jäger, ISSN 2017. Kerksick, ISSN 2018. | solide |
| Méta-analyse de 49 essais : les gains de masse maigre plafonnent autour de 1,6 g par kilo (intervalle 1,0 à 2,2) ; environ 2,2 g pour maximiser ; effet faible comparé à l'entraînement lui-même. | Morton et al., Br J Sports Med 2018 (résumé et texte complet). Kerksick 2018 (1,62 g/kg comme point de départ). | solide |
| Répartir les protéines : 0,3 g par kilo toutes les 3 à 5 h ; ISSN : 20 à 40 g par prise, toutes les 3 à 4 h. | Position commune 2016. ISSN 2017. | solide |
| Sur une journée, une répartition régulière augmente la fabrication de protéines musculaires (4 × 20 g mieux que 2 × 40 g ou 8 × 10 g ; +25 % sur 24 h avec des repas égaux). | Areta et al., J Physiol 2013. Mamerow et al., J Nutr 2014. | probable (études d'une journée ou d'une semaine ; sur 8 semaines, chez des personnes âgées, Kim et al., Clin Nutr 2018 ne trouve aucune différence : le cours ne dit que « sur une journée ») |
| Les besoins s'atteignent en général avec l'alimentation ; les poudres sont un moyen pratique, efficaces avec la musculation sans plus. | Position commune 2016. ISSN 2017. Maughan et al., CIO 2018. | solide |
| Poulet cuit 26,2 g de protéines pour 100 g (USDA : 31 g) ; œuf dur 13,5 g, œuf cru 12,3 g ; thon au naturel 24,5 g ; tofu 11,5 g ; lentilles cuites 8,1 g (USDA : 9 g) ; fromage blanc 7,54 g ; lait demi-écrémé 3,3 g ; pain complet 9 g. | Ciqual 2013 (toutes ces valeurs). USDA FoodData Central (poulet, lentilles). | probable (à recouper avec Ciqual 2025) |
| Avec une maladie ou un traitement, demander conseil avant de changer beaucoup son alimentation. | NHS, traitement de l'obésité (lu pour le lot 0 : en parler à un professionnel avec une maladie ou un traitement). Anses, compléments pour sportifs (en parler à un professionnel de santé). | probable (règle de prudence) |

Ce que le cours ne dit pas, exprès : « les protéines abîment les reins »,
« 30 g au maximum par repas », « le shaker est indispensable », aucune marque.

---

## 5. « Combien de glucides quand tu t’entraînes » (cours)

Réécriture de « Les glucides ne sont pas l’ennemi de ta séance ».

| Affirmation | Sources lues | Niveau |
|---|---|---|
| Les glucides alimentent le cerveau et les efforts intenses ; les réserves de glycogène sont limitées. | Position commune 2016. Kerksick, ISSN 2018. | solide |
| Repères par charge : léger 3 à 5 g par kilo et par jour, modéré (environ 1 h par jour) 5 à 7, endurance (1 à 3 h par jour) 6 à 10, extrême (4 à 5 h par jour) 8 à 12 ; forme générale (30 à 40 min, trois fois par semaine) 3 à 5. | Position commune 2016 (tableau 1). Kerksick, ISSN 2018. | solide |
| Tant que les besoins totaux sont couverts, la répartition se décide selon le confort de chacun. | Position commune 2016. Aragon et Schoenfeld, JISSN 2013 (l'apport total compte plus que le moment, lu pour le lot 0). | probable |
| En musculation, après un repas normal, les glucides n'améliorent pas une séance de moins d'une dizaine de séries par muscle ; à long terme, aucune influence dans 15 études sur 17. | Henselmans et al., Nutrients 2022. Escobar et al., Br J Nutr 2016. | probable |
| Privilégier céréales complètes, légumes et fruits ; garder les sucres rapides et produits sportifs pour les recharges rapides ; sucres : pas plus de 100 g par jour. | Kerksick, ISSN 2018. Anses, « Les sucres dans l'alimentation ». Anses 2016 (glucides complexes à faible index glycémique). | solide |
| Pendant l'effort : 30 à 60 g par heure, jusqu'à 90 g au-delà de 2 h 30 ; bénéfice net surtout au-delà de 90 min. | Position commune 2016. Burke et al. 2011. Kerksick 2018. | solide |
| Pour un effort intense d'environ une heure, se rincer la bouche avec une boisson sucrée peut aider. | Position commune 2016 (rinçage de bouche pour 45 à 75 min). Burke et al. 2011. | probable |
| Riz blanc cuit : 28,6 g de glucides pour 100 g ; pain complet : 50,6 g. | USDA FoodData Central (riz). Ciqual 2013 (pain complet). | probable (à recouper avec Ciqual 2025) |

Ce que le cours ne dit pas, exprès : « les glucides du soir font grossir »,
« le régime cétogène améliore la performance », aucun index glycémique chiffré.

---

## 6. « Combien boire quand tu fais du sport » (cours)

Réécriture de « Boire assez, sans faire de ta gourde un devoir ».

| Affirmation | Sources lues | Niveau |
|---|---|---|
| Boire selon sa soif suffit dans la plupart des cas. | McDermott et al., NATA 2017. Position commune 2016 (« thirst sensation ... usually a good indication »). | solide |
| La sueur varie de 0,3 à 2,4 l par heure, jusqu'à 4 l chez certains. | Position commune 2016. NATA 2017 (0,5 à 4 l par heure). | solide |
| Au-delà de 2 % du poids perdu, la performance baisse au chaud ou par temps doux ; elle peut tenir au frais. | NATA 2017. Position commune 2016. Sawka et al., position ACSM 2007. | solide |
| Moins d'une heure : de l'eau suffit ; au-delà ou par forte chaleur, glucides et électrolytes peuvent aider. | NATA 2017. ACSM 2007 (« under certain circumstances »). | solide |
| Le sel devient utile si la sueur dépasse 1,2 l par heure, si elle est très salée, ou si l'effort dépasse 2 h ; environ 1 g de sodium par litre de sueur en moyenne. | Position commune 2016. NATA 2017 (0,2 à 7,3 g de sodium perdus par heure selon les personnes). | probable |
| Boire plus que ses pertes peut causer une hyponatrémie (trop peu de sel dans le sang) ; 10 à 20 % des marathoniens testés, cas graves rares, plus fréquente chez les femmes et au-delà de 4 h ; prendre du poids pendant l'effort signe un excès. | NATA 2017. Position commune 2016 (sportifs de loisir qui boivent plus que leurs pertes ; femmes plus à risque). | solide |
| Se peser avant et après permet d'estimer sa sueur (le poids perdu pendant l'effort est surtout de l'eau : un kilo, à peu près un litre) ; après l'effort, boire 1,25 à 1,5 l par kilo perdu. | ACSM 2007. Position commune 2016. | solide |
| La couleur des urines est un repère personnel, à juger dans un récipient transparent et de préférence le matin. | NATA 2017. | probable (une source) |

Ce que le cours ne dit pas, exprès : « boire 2 litres par jour », « boire
avant d'avoir soif », « les crampes viennent du manque de magnésium ».

---

## 7. « Pourquoi la balance bouge chaque jour » (cours)

| Affirmation | Sources lues | Niveau |
|---|---|---|
| La balance additionne tout ; l'eau stockée avec le glycogène (3 g par gramme), le sel et le contenu de l'intestin la font bouger. | Lot 0 : Fernández-Elías et al. 2015, Kreitzman et al. 1992, position commune 2016. | solide |
| Le poids est plus haut le dimanche et le lundi, puis baisse en semaine ; c'est un rythme normal. | Orsama et al., Obes Facts 2014 (80 adultes, 4 657 pesées). Turicchi et al., PLoS One 2020 (jusqu'à 1 421 participants, 0,35 % de variation dans la semaine). | solide |
| Pendant les fêtes de fin d'année, +1,35 % en moyenne, pas entièrement reperdu les mois suivants. | Turicchi 2020. | probable (une étude) |
| Le poids monte d'environ 0,45 kg pendant les règles, par de l'eau ; la sensation de rétention est la plus forte le premier jour des règles. | Kanellakis et al., Am J Hum Biol 2023 (42 femmes). Wagner et al., IJSNEM 2026 (21 femmes actives : écart lié à l'hydratation). White et al., Obstet Gynecol Int 2011 (765 cycles). | probable |
| Se peser régulièrement est associé à plus de perte de poids, sans effet psychologique négatif retrouvé chez les personnes qui cherchent à maigrir. | Zheng et al., Obesity 2015 (17 études). Steinberg et al., Obesity 2013 (essai : -6,55 % contre -0,35 % en six mois, pesée bien vécue). | solide |
| Chez d'autres personnes, surtout les femmes et les plus jeunes, la pesée est liée à une humeur, une estime de soi ou une image du corps moins bonnes ; on peut espacer les pesées ou s'en passer. | Pacanowski, Linde et Neumark-Sztainer, Curr Obes Rep 2015 (20 articles). | débattu |

Ce que le cours ne dit pas, exprès : « pèse-toi tous les jours », « ne te
pèse jamais », un poids idéal, l'indice de masse corporelle.

---

## 8. « Faire une assiette sans rien peser » (cours)

| Affirmation | Sources lues | Niveau |
|---|---|---|
| La moitié de l'assiette en légumes et fruits, un quart en céréales complètes, un quart en protéines, des huiles végétales avec modération ; des proportions sans calories, valables pour un bol ou un plat unique. | Harvard T.H. Chan School of Public Health, « Healthy Eating Plate ». Santé publique France 2019 (5 portions de fruits et légumes, un féculent à chaque repas dont un complet par jour). | solide |
| Les pommes de terre comptent comme féculent, pas comme légume. | Harvard. NHS, « 5 A Day portion sizes ». | solide |
| Une portion de fruits ou de légumes : 80 g (80 à 100 g pour Santé publique France), par exemple trois cuillères à soupe bombées de légumes cuits, sept tomates cerises, une pomme ; les légumes secs ne comptent qu'une fois par jour. | NHS, « 5 A Day portion sizes ». Santé publique France 2019. | solide |
| Protéines : poisson deux fois par semaine dont un gras, légumes secs au moins deux fois, viande hors volaille au plus 500 g par semaine, charcuterie au plus 150 g ; produits laitiers : deux par jour (une portion = 150 ml de lait = 125 g de yaourt = 30 g de fromage). | Santé publique France 2019. Harvard (limiter la viande rouge, éviter la charcuterie). | solide |
| Manger en faisant autre chose fait manger un peu plus au repas, et davantage ensuite. | Robinson et al., AJCN 2013 (24 études). Hollands 2015 (l'environnement du repas change les quantités), cohérent. | probable |
| Huiles : colza, noix et olive, tous les jours en petite quantité. | Santé publique France 2019. Harvard (huiles végétales). | solide |
| Les jours d'entraînement chargés, l'assiette du sportif fait plus de place aux féculents. | Reguant-Closa et al., IJSNEM 2019 et Nutrients 2020 (« Athlete's Plate »). Position commune 2016 (glucides selon la charge). | probable |
| Des portions, des paquets et de la vaisselle plus grands font manger plus, adultes comme enfants. | Hollands et al., Cochrane 2015 (72 études, qualité moyenne). Robinson et al., AJCN 2013 (ne pas voir ce qu'on a mangé augmente la prise), cohérent. | probable |

Ce que le cours ne dit pas, exprès : « la méthode de la main », une taille
d'assiette précise, un nombre de calories par repas.

---

## 9. « Faut-il prendre un petit-déjeuner ? » (flash)

| Affirmation | Sources lues | Niveau |
|---|---|---|
| 309 adultes, 16 semaines : prendre ou sauter le petit-déjeuner ne change pas la perte de poids. | Dhurandhar et al., AJCN 2014. Sievert et al., BMJ 2019 (13 essais), cohérent. | solide |
| Méta-analyse : ceux qui prennent un petit-déjeuner mangent environ 260 kcal de plus par jour ; ceux qui le sautent pèsent 0,44 kg de moins ; essais courts, qualité faible. | Sievert 2019. Betts et al., AJCN 2014 (539 kcal de plus), cohérent. | probable (qualité faible) |
| Six semaines : pas d'adaptation du métabolisme ; 539 kcal mangées en plus, compensées par 442 kcal de dépense d'activité en plus, surtout le matin ; même poids ; glycémie plus stable l'après-midi et le soir. | Betts et al., AJCN 2014 (33 adultes minces). Dhurandhar 2014 (même poids), cohérent. | probable |
| Les glucides du matin reconstituent le glycogène du foie entamé pendant la nuit, utile avant un effort long. | Position commune 2016. Aird 2018 (manger avant aide l'effort prolongé). | probable |

Ce que le cours ne dit pas, exprès : « le repas le plus important de la
journée », « sauter le petit-déjeuner fait maigrir ».

---

## 10. « Manger tard fait-il grossir ? » (flash)

| Affirmation | Sources lues | Niveau |
|---|---|---|
| À calories égales, un gros petit-déjeuner ou un gros dîner donnent la même perte de poids et la même dépense ; moins de faim avec le gros petit-déjeuner. | Ruddick-Collins et al., Cell Metab 2022 (30 personnes, deux fois 4 semaines). Betts 2014 (pas d'adaptation du métabolisme de repos selon l'horaire du premier repas), cohérent. | probable |
| Repas décalés d'environ 4 h : plus de faim, leptine -16 % à l'éveil, 59 kcal de dépense en moins par jour d'éveil, gènes du tissu adipeux orientés vers le stockage ; quelques jours en laboratoire. | Vujović et al., Cell Metab 2022 (16 adultes, résumé et texte). Cummings et al., Diabetes 2001 (la ghréline règle la faim autour des repas), cohérent. | probable (mécanismes, pas de perte de poids mesurée) |

Ce que le cours ne dit pas, exprès : « après 20 h, ça se transforme en
graisse », une heure limite pour dîner.

---

## 11. « La vitamine D en hiver » (flash)

| Affirmation | Sources lues | Niveau |
|---|---|---|
| La vitamine D aide à absorber le calcium et le phosphore (os, dents, muscles) ; deux sources : le soleil sur la peau et l'alimentation. | Anses, « Vitamine D » (page lue). NHS, « Vitamin D ». | solide |
| En hiver, aux latitudes de la France, le soleil ne fait presque plus fabriquer de vitamine D : aucune synthèse de novembre à février à 42° nord, d'octobre à mars à 52° nord ; au Royaume-Uni, pas assez d'octobre à début mars. | Webb, Kline et Holick, J Clin Endocrinol Metab 1988 (Boston, 42,2° nord ; Edmonton, 52° nord). NHS, « Vitamin D ». Repères de géographie du cours : Perpignan est à 42,7° nord, Lille à 50,6° nord, la France métropolitaine entre environ 42 et 51° nord. | solide |
| Référence adulte : 15 microgrammes par jour par l'alimentation ; apports moyens réels : 3,1 microgrammes ; même une alimentation optimisée n'atteint pas la référence. | Anses, « Vitamine D » (INCA 3). Anses 2016 (3,4 microgrammes dans les menus optimisés). | solide |
| Sources : poissons gras (hareng, sardine, saumon, maquereau), huile de foie de morue, jaune d'œuf, certains champignons, produits enrichis ; deux portions de poisson par semaine dont une grasse. | Anses, « Vitamine D ». Santé publique France 2019. | solide |
| Royaume-Uni : tout le monde devrait envisager 10 microgrammes (400 UI) par jour en automne et en hiver ; 1 microgramme = 40 UI. | NHS, « Vitamin D ». | solide (politique britannique, sa page officielle) |
| Groupes plus à risque de manque : personnes âgées, nourrissons, grossesse, ménopause, peaux mates ou foncées, alimentation sans produits animaux ; nourrissons : surdosages avec des compléments, préférer les médicaments sur prescription. | Anses, « Vitamine D ». NHS (toute l'année pour les personnes peu dehors ou à la peau foncée). | solide |
| Ne pas dépasser 100 microgrammes (4 000 UI) par jour chez l'adulte ; l'excès donne une hypercalcémie. | EFSA, limite supérieure 2023 (EFSA Journal). NHS. Anses (signes de l'excès). | solide |
| 2 000 UI par jour pendant cinq ans n'ont pas réduit les cancers, les accidents cardiovasculaires ni les fractures chez des adultes en bonne santé. | Manson et al., NEJM 2019 (VITAL). LeBoff et al., NEJM 2022 (VITAL, fractures). | solide |

Ce que le cours ne dit pas, exprès : « tout le monde manque de vitamine D »,
« la vitamine D protège du Covid », une dose à prendre sans avis.

---

## 12. « Faim ou envie : comment faire la différence » (cours)

| Affirmation | Sources lues | Niveau |
|---|---|---|
| La faim répond au besoin d'énergie, l'envie au plaisir ; les deux se recouvrent. | Lowe et Butryn, Physiol Behav 2007 (faim hédonique). Hill, Proc Nutr Soc 2007. | probable |
| La ghréline, hormone produite surtout par l'estomac, double presque avant chaque repas habituel puis retombe dans l'heure. | Cummings et al., Diabetes 2001 (10 personnes). Vujović 2022 (ghréline et leptine selon l'horaire des repas), cohérent. | probable |
| L'envie est intense et vise un aliment précis ; elle est très fréquente ; elle naît de pensées, de signaux appris et de l'humeur ; l'idée d'un besoin nutritionnel précis n'est pas confirmée. | Hill 2007. Lowe et Butryn 2007 (motivations hédoniques). | probable |
| Se priver d'un aliment précis s'accompagne d'une envie plus forte de cet aliment. | Hill 2007. | probable (une revue) |
| Manger en faisant autre chose fait manger un peu plus au repas, et davantage ensuite ; se souvenir de ce qu'on a mangé fait manger moins plus tard. | Robinson et al., AJCN 2013 (24 études). Hollands et al., Cochrane 2015 (l'environnement du repas change ce qu'on mange), cohérent. | probable |
| Prendre plaisir à manger, prendre le temps de déguster. | Santé publique France 2019. | solide (recommandation officielle) |
| Ligne d'écoute « Anorexie Boulimie Info Écoute » : 0810 037 037, quatre jours par semaine de 16 h à 18 h, 0,06 € la minute en plus du prix d'un appel local. | Fédération française anorexie boulimie (FFAB), page lue le 25 octobre 2026. | solide (information de service) |

Ce que le cours ne dit pas, exprès : « une envie de chocolat = manque de
magnésium », « résiste à tes envies », aucun diagnostic de trouble alimentaire.

---

## 13. « Les compléments pour le sport : ce qui a des preuves » (cours)

| Affirmation | Sources lues | Niveau |
|---|---|---|
| Seuls quelques compléments ont assez de preuves pour des gains modestes : caféine, créatine monohydrate, nitrate, bicarbonate, peut-être bêta-alanine. | Maughan et al., déclaration de consensus du CIO 2018 (texte complet). Kreider et al., ISSN 2017 (créatine) ; Guest et al., ISSN 2021 (caféine). | solide |
| Les poudres de protéines sont efficaces avec la musculation, sans plus. | CIO 2018. Morton 2018 (petit effet). | solide |
| Brûleurs de graisse : preuves très loin d'être concluantes, absentes pour la plupart. | CIO 2018. Anses, avis du 20 décembre 2016 (bénéfices « très fortement hypothétiques »). | solide |
| 49 signalements d'effets indésirables liés aux compléments pour le muscle ou la perte de gras, surtout cardiovasculaires et psychiques ; à éviter avec une maladie du cœur, des reins ou du foie, chez les enfants et adolescents, pendant la grossesse et l'allaitement. | Anses, avis du 20 décembre 2016 (page et avis). | probable (une source officielle sur ces chiffres) |
| 14,8 % de 634 compléments contenaient des stéroïdes non déclarés ; une revue récente trouve 9 à 15 % de produits contaminés, surtout pré-workouts, produits minceur et produits pour le muscle. | Geyer et al., Int J Sports Med 2004. Al-Saad et al., Front Sports Act Living 2026 (revue de 44 études). CIO 2018 (contamination), cohérent. | solide |
| Aucun complément n'est certifié par l'AMA ou l'AFLD ; le sportif contrôlé est responsable de ce qu'on trouve dans son corps, jusqu'à 4 ans de suspension ; « naturel » ne protège pas. | AFLD, « Compléments alimentaires » (page lue). CIO 2018 (les tests par un tiers réduisent le risque sans le supprimer). | solide |
| Bons réflexes : norme NF EN 17444 ou programmes de contrôle (Sport Protect, Informed Sport, NSF, Liste de Cologne) ; acheter en pharmacie, en magasin ou sur le site du fabricant ; photographier boîte, étiquette et numéro de lot ; ne pas en associer plusieurs ; en parler à un professionnel de santé ; signaler un effet indésirable. | AFLD. Anses 2016. | solide |
| Les compléments contenant de la caféine sont déconseillés avant et pendant le sport. | Anses 2016. | probable (une source officielle ; règle de prudence) |
| L'effet des boissons énergisantes et des pré-workouts vient surtout de leur caféine. | Guest et al., ISSN 2021. CIO 2018 (caféine efficace), cohérent. | probable |

Ce que le cours ne dit pas, exprès : aucune marque, aucun produit conseillé,
« les compléments sont dangereux » en général.

---

## 14. « Créatine : ce que disent les études » (cours, Vaiiya+)

Réécriture de « Créatine : le solide et le marketing ».

| Affirmation | Sources lues | Niveau |
|---|---|---|
| Le corps fabrique la créatine dans les reins et le foie, à partir de trois acides aminés ; on la trouve aussi dans la viande. | Antonio et al., JISSN 2021 (texte complet). Kreider, ISSN 2017. | solide |
| Elle augmente les réserves de créatine du muscle et accélère la reconstitution de la phosphocréatine, ce qui aide les efforts courts, très intenses et répétés, et les adaptations à l'entraînement. | CIO 2018. Règlement (UE) n° 432/2012 (allégation autorisée : séries successives d'exercices très intenses de courte durée, 3 g par jour, adultes). | solide |
| 3 à 5 g par jour ; la phase de charge (20 g par jour pendant 5 à 7 jours) n'est pas nécessaire : 3 g par jour pendant 28 jours remplissent autant les muscles. | Antonio 2021. CIO 2018 (charge puis 3 à 5 g). | solide |
| La forme monohydrate est la plus étudiée ; elle se dégrade dans un liquide qui attend. | Kreider 2017. Antonio 2021. | solide |
| La prise de poids du début est surtout de l'eau dans le muscle (1 à 2 kg après une charge) ; elle peut gêner l'endurance et les sports à catégories de poids ; la créatine n'augmente pas la masse grasse. | CIO 2018. Antonio 2021 (eau intracellulaire, pas toujours de rétention ; « does not increase fat mass »). | solide |
| Adolescents : une revue de 2021 juge la créatine sûre et peut-être utile à cet âge ; l'Anses déconseille les compléments pour sportifs aux mineurs. | Antonio 2021. Anses 2016. | débattu |
| Pas d'effet néfaste sur les reins chez les personnes en bonne santé aux doses recommandées ; sûre jusqu'à 30 g par jour pendant 5 ans dans les études. | Antonio 2021. Kreider 2017. | solide |
| Elle ne provoque ni déshydratation ni crampes. | Antonio 2021. Kreider 2017. | probable |
| Chute des cheveux : une seule étude sur une hormone, jamais reproduite, aucune chute rapportée. | Antonio 2021. | probable (une revue) |
| 170 g de bœuf apportent environ 0,7 g de créatine. | Antonio 2021. | probable (une source) |
| Réservée aux adultes ; compléments pour sportifs déconseillés avec une maladie du cœur, des reins ou du foie, chez les mineurs, pendant la grossesse. | Règlement 432/2012. Anses 2016. | solide |

Ce que le cours ne dit pas, exprès : « la créatine est un stéroïde », « elle
fait gonfler », une marque, un moment idéal de prise.

---

## 15. « La caféine avant l’effort » (cours, Vaiiya+)

| Affirmation | Sources lues | Niveau |
|---|---|---|
| La caféine améliore la performance dans beaucoup de sports, chez les sportifs entraînés ou non, avec de grandes différences d'une personne à l'autre ; elle aide aussi la vigilance. | Guest et al., ISSN 2021 (texte complet). CIO 2018. | solide |
| 3 à 6 mg par kilo environ 60 min avant ; des doses plus faibles (autour de 2 à 3 mg par kilo, environ 200 mg) marchent aussi ; effets indésirables à partir de 9 mg par kilo. | Guest 2021. CIO 2018. | solide |
| Une dose unique jusqu'à 200 mg (environ 3 mg par kilo) est sans risque pour un adulte en bonne santé, y compris moins de 2 h avant un exercice intense ; jusqu'à 400 mg par jour au total. | EFSA, avis 2015 (page thématique lue). Anses 2016 (pas de toxicité générale sous 400 mg par jour chez l'adulte). | solide |
| 100 mg peuvent gêner la durée et la qualité du sommeil, surtout près du coucher. | EFSA 2015. | probable (une source) |
| Teneurs indicatives : expresso 80 mg, café filtre (200 ml) 90 mg, thé noir 50 mg, canette de cola 40 mg, canette de boisson énergisante 80 mg, 50 g de chocolat noir 25 mg. | EFSA 2015. | probable (une source, valeurs indicatives) |
| Agitation, tremblements, troubles du rythme cardiaque, surtout à forte dose et sans habitude ; risque de coup de chaleur à l'effort par forte chaleur ; anxiété possible dès 210 mg par jour ; compléments de caféine déconseillés avant et pendant le sport. | Anses 2016 (avis). CIO 2018 (effets secondaires aux doses élevées), cohérent. | probable |
| Grossesse et allaitement : pas plus de 200 mg par jour ; adolescents : 3 mg par kilo et par jour. | EFSA 2015. Anses 2016 (compléments à éviter chez les mineurs et pendant la grossesse). | solide |

Ce que le cours ne dit pas, exprès : aucune marque de pré-workout, « plus
c'est fort, mieux c'est », aucune dose au-delà de 200 mg en une prise.

---

## Liens

### Recommandations officielles et textes de loi
- Anses, Les protéines : https://www.anses.fr/fr/content/les-prot%C3%A9ines
- Anses, Les lipides : https://www.anses.fr/fr/content/les-lipides
- Anses, Les sucres dans l'alimentation : https://www.anses.fr/fr/article/sucres-lalimentation
- Anses, Actualisation des repères du PNNS (rapport 2016) : https://www.anses.fr/sites/default/files/NUT2012SA0103Ra-1.pdf
- Anses, Vitamine D : pourquoi et comment assurer un apport suffisant ? : https://www.anses.fr/fr/article/vitamine-pourquoi-comment-assurer-apport-suffisant
- Anses, Compléments alimentaires destinés aux sportifs (20 décembre 2016) : https://www.anses.fr/fr/actualite/complements-alimentaires-destines-aux-sportifs-risques-sante-benefices-incertains
- Anses, avis sur les compléments pour sportifs (saisine 2014-SA-0008) : https://www.anses.fr/fr/system/files/NUT2014SA0008Ra.pdf
- Santé publique France, Recommandations pour les adultes (2019) : https://www.santepubliquefrance.fr/sites/default/files/rdd/document/42466_spf00000619.pdf
- NHS, How to get more fibre into your diet : https://www.nhs.uk/live-well/eat-well/digestive-health/how-to-get-more-fibre-into-your-diet/
- NHS, 5 A Day portion sizes : https://www.nhs.uk/live-well/eat-well/5-a-day/portion-sizes/
- NHS, Vitamin D : https://www.nhs.uk/conditions/vitamins-and-minerals/vitamin-d/
- NHS, Obesity treatment : https://www.nhs.uk/conditions/obesity/treatment/
- OMS, recommandation sur les sucres (2015) : https://www.who.int/news/item/04-03-2015-who-calls-on-countries-to-reduce-sugars-intake-among-adults-and-children
- EFSA, Caffeine : https://www.efsa.europa.eu/en/topics/topic/caffeine
- EFSA, limite supérieure de vitamine D (EFSA Journal 2023) : https://pmc.ncbi.nlm.nih.gov/articles/PMC10407748/
- AFLD, Compléments alimentaires : https://www.afld.fr/complements-alimentaires/
- FFAB, permanence téléphonique : https://www.ffab.fr/trouver-de-l-aide/permanence-telephonique
- Harvard T.H. Chan School of Public Health, Healthy Eating Plate : https://nutritionsource.hsph.harvard.edu/healthy-eating-plate/
- British Dietetic Association, Fibre : https://www.bda.uk.com/resource/fibre.html
- Règlement (UE) n° 1169/2011 (information du consommateur) : https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32011R1169
- Règlement (CE) n° 1924/2006 (allégations nutritionnelles) : https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R1924
- Règlement (UE) n° 432/2012 (allégations de santé autorisées) : https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32012R0432

### Prises de position des sociétés savantes
- Thomas, Erdman et Burke, Nutrition and Athletic Performance (2016), copie officielle Dietitians of Canada : https://www.dietitians.ca/DietitiansOfCanada/media/Documents/Resources/noap-position-paper.pdf
- Jäger et al., ISSN position stand: protein and exercise (2017) : https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/
- Kerksick et al., ISSN exercise & sports nutrition review update (2018) : https://pmc.ncbi.nlm.nih.gov/articles/PMC6090881/
- Kerksick et al., ISSN position stand: nutrient timing (2017) : https://pmc.ncbi.nlm.nih.gov/articles/PMC5596471/
- McDermott et al., NATA position statement: fluid replacement (2017) : https://pmc.ncbi.nlm.nih.gov/articles/PMC5634236/
- Sawka et al., ACSM position stand: exercise and fluid replacement (2007) : https://pubmed.ncbi.nlm.nih.gov/17277604/
- Burke et al., Carbohydrates for training and competition (consensus du CIO, 2011) : https://pubmed.ncbi.nlm.nih.gov/21660838/
- Maughan et al., IOC consensus statement: dietary supplements and the high-performance athlete (2018) : https://pmc.ncbi.nlm.nih.gov/articles/PMC5867441/
- Kreider et al., ISSN position stand: creatine (2017) : https://pmc.ncbi.nlm.nih.gov/articles/PMC5469049/
- Guest et al., ISSN position stand: caffeine and exercise performance (2021) : https://pmc.ncbi.nlm.nih.gov/articles/PMC7777221/

### Études
- Reynolds et al., The Lancet 2019 : https://pubmed.ncbi.nlm.nih.gov/30638909/
- Aird, Davies et Carson, Scand J Med Sci Sports 2018 : https://pubmed.ncbi.nlm.nih.gov/29315892/
- Henselmans et al., Nutrients 2022 : https://pubmed.ncbi.nlm.nih.gov/35215506/
- Escobar et al., Br J Nutr 2016 : https://pubmed.ncbi.nlm.nih.gov/27993175/
- Slater et Phillips, J Sports Sci 2011 : https://pubmed.ncbi.nlm.nih.gov/21660839/
- Morton et al., Br J Sports Med 2018 : https://pmc.ncbi.nlm.nih.gov/articles/PMC5867436/
- Areta et al., J Physiol 2013 : https://pubmed.ncbi.nlm.nih.gov/23459753/
- Mamerow et al., J Nutr 2014 : https://pmc.ncbi.nlm.nih.gov/articles/PMC4018950/
- Kim et al., Clin Nutr 2018 : https://pubmed.ncbi.nlm.nih.gov/28318687/
- Hudson et al., Adv Nutr 2020 : https://doi.org/10.1093/advances/nmz106
- van Vliet, Burd et van Loon, J Nutr 2015 : https://doi.org/10.3945/jn.114.204305
- Aragon et Schoenfeld, JISSN 2013 : https://pmc.ncbi.nlm.nih.gov/articles/PMC3577439/
- Orsama et al., Obes Facts 2014 : https://pmc.ncbi.nlm.nih.gov/articles/PMC5644907/
- Turicchi et al., PLoS One 2020 : https://pmc.ncbi.nlm.nih.gov/articles/PMC7192384/
- Kanellakis et al., Am J Hum Biol 2023 : https://pubmed.ncbi.nlm.nih.gov/37395124/
- Wagner et al., IJSNEM 2026 : https://pubmed.ncbi.nlm.nih.gov/42722363/
- White et al., Obstet Gynecol Int 2011 : https://pmc.ncbi.nlm.nih.gov/articles/PMC3154522/
- Zheng et al., Obesity 2015 : https://pubmed.ncbi.nlm.nih.gov/25521523/
- Steinberg et al., Obesity 2013 : https://pmc.ncbi.nlm.nih.gov/articles/PMC3788086/
- Pacanowski, Linde et Neumark-Sztainer, Curr Obes Rep 2015 : https://pmc.ncbi.nlm.nih.gov/articles/PMC4729441/
- Fernández-Elías et al., Eur J Appl Physiol 2015 : https://doi.org/10.1007/s00421-015-3175-z
- Kreitzman, Coxon et Szaz, Am J Clin Nutr 1992 : https://pubmed.ncbi.nlm.nih.gov/1615908/
- Reguant-Closa et al., IJSNEM 2019 : https://pubmed.ncbi.nlm.nih.gov/31141408/
- Reguant-Closa et al., Nutrients 2020 : https://pmc.ncbi.nlm.nih.gov/articles/PMC7468909/
- Hollands et al., Cochrane 2015 : https://pmc.ncbi.nlm.nih.gov/articles/PMC4579823/
- Robinson et al., AJCN 2013 : https://pmc.ncbi.nlm.nih.gov/articles/PMC3607652/
- Sievert et al., BMJ 2019 : https://pmc.ncbi.nlm.nih.gov/articles/PMC6352874/
- Dhurandhar et al., AJCN 2014 : https://pmc.ncbi.nlm.nih.gov/articles/PMC4095657/
- Betts et al., AJCN 2014 : https://pmc.ncbi.nlm.nih.gov/articles/PMC4095658/
- Ruddick-Collins et al., Cell Metab 2022 : https://pmc.ncbi.nlm.nih.gov/articles/PMC9605877/
- Vujović et al., Cell Metab 2022 : https://pmc.ncbi.nlm.nih.gov/articles/PMC10184753/
- Jakubowicz et al., Obesity 2013 : https://pubmed.ncbi.nlm.nih.gov/23512957/
- Cummings et al., Diabetes 2001 : https://pubmed.ncbi.nlm.nih.gov/11473029/
- Webb, Kline et Holick, J Clin Endocrinol Metab 1988 : https://pubmed.ncbi.nlm.nih.gov/2839537/
- Manson et al. (VITAL), NEJM 2019 : https://pmc.ncbi.nlm.nih.gov/articles/PMC6425757/
- LeBoff et al. (VITAL), NEJM 2022 : https://pmc.ncbi.nlm.nih.gov/articles/PMC9716639/
- Hill, Proc Nutr Soc 2007 : https://pubmed.ncbi.nlm.nih.gov/17466108/
- Lowe et Butryn, Physiol Behav 2007 : https://pubmed.ncbi.nlm.nih.gov/17531274/
- Geyer et al., Int J Sports Med 2004 : https://pubmed.ncbi.nlm.nih.gov/14986195/
- Al-Saad et al., Front Sports Act Living 2026 : https://pmc.ncbi.nlm.nih.gov/articles/PMC13021601/
- Antonio et al., JISSN 2021 : https://pmc.ncbi.nlm.nih.gov/articles/PMC7871530/

### Tables de composition
- Ciqual 2013 (miroir sous licence ouverte), poulet, blanc, sans peau, cuit : https://informationsnutritionnelles.fr/poulet-blanc-sans-peau
- Ciqual 2013, œuf dur : https://informationsnutritionnelles.fr/oeuf-dur
- Ciqual 2013, œuf cru : https://informationsnutritionnelles.fr/oeuf
- Ciqual 2013, thon au naturel, appertisé, égoutté : https://informationsnutritionnelles.fr/thon-au-naturel
- Ciqual 2013, fromage blanc nature ou aux fruits (aliment moyen) : https://informationsnutritionnelles.fr/fromage-blanc-nature-ou-aux-fruits
- Ciqual 2013, yaourt au lait entier, nature : https://informationsnutritionnelles.fr/yaourt-au-lait-nature
- Ciqual 2013, spécialité laitière ou yaourt au lait entier, avec crème, nature : https://informationsnutritionnelles.fr/specialite-laitiere-ou-yaourt-au-lait-avec-creme-nature
- Ciqual 2013, lait demi-écrémé UHT : https://informationsnutritionnelles.fr/lait-demi-ecreme-uht
- Ciqual 2013, pain complet ou intégral : https://informationsnutritionnelles.fr/pain-complet-ou-integral
- Ciqual 2013, lentille, cuite : https://informationsnutritionnelles.fr/lentille
- Ciqual 2013, pois chiche, cuit : https://informationsnutritionnelles.fr/pois-chiche
- Ciqual 2013, haricot blanc, cuit : https://informationsnutritionnelles.fr/haricot-blanc-cuit
- Ciqual 2013, tofu : https://informationsnutritionnelles.fr/tofu
- USDA FoodData Central, blanc de poulet rôti (171477) : https://fdc.nal.usda.gov/food-details/171477/nutrients
- USDA FoodData Central, lentilles cuites (172421) : https://fdc.nal.usda.gov/food-details/172421/nutrients
- USDA FoodData Central, pois chiches cuits (173757) : https://fdc.nal.usda.gov/food-details/173757/nutrients
- USDA FoodData Central, riz blanc moyen grain cuit (168880) : https://fdc.nal.usda.gov/food-details/168880/nutrients
