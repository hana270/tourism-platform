

## Remise à zéro contrôlée des données

Le script conserve les comptes administrateurs et les réglages du site par défaut :

```bat
cd backend
npm run db:reset-data
```

Pour supprimer également les utilisateurs, sessions, tokens et réglages :

```bat
npm run db:reset-data -- --all
```

Ces commandes sont destructives. Faites une sauvegarde et vérifiez `DATABASE_URL` avant de les exécuter.

## Disponibilité et images

- Le calendrier administrateur est en lecture seule et sert à vérifier les périodes bloquées.
- Les blocages sont créés automatiquement par une réservation **Confirmée et Payée** et sont libérés si l’un des deux statuts est retiré.
- Les images d’offres utilisent des noms UUID non prévisibles, une validation du contenu réel, une limite de pixels et une conversion WebP.
- Les catégories n’acceptent qu’une image de couverture ; les offres peuvent avoir plusieurs photos.
- Pour Render, utilisez un stockage objet persistant pour éviter la perte des uploads lors d’un redéploiement.
