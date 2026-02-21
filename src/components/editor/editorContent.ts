export function getEditorContent() {
  return `
    <span style="display: block;"></span>
        <h1>Éditeur – Document de test complet</h1>

    <p>
      Ceci est un <strong>paragraphe en gras</strong>, avec du <em>texte en italique</em>,
      du <u>souligné</u>, et même un <a href="https://example.com">lien externe</a>.
    </p>

    <p>
      Test de texte long pour voir comment la sélection, le bubble menu et les flottants
      se comportent quand une ligne devient vraiment, vraiment, vraiment très longue
      et dépasse la largeur normale du conteneur.
    </p>

    <hr />

    <h2>Liste à puces</h2>
    <ul>
      <li>Premier élément</li>
      <li>Deuxième élément avec <strong>mise en forme</strong></li>
      <li>
        Élément avec sous-liste
        <ul>
          <li>Sous élément A</li>
          <li>Sous élément B</li>
        </ul>
      </li>
    </ul>

    <h2>Liste numérotée</h2>
    <ol>
      <li>Étape 1</li>
      <li>Étape 2</li>
      <li>Étape 3</li>
    </ol>

    <hr />

    <h2>Bloc de citation</h2>
    <blockquote>
      Un bon éditeur ne se juge pas quand tout va bien,
      mais quand l’utilisateur fait des choses absurdes.
    </blockquote>

    <hr />

    <h2>Tableau principal (test lignes & colonnes)</h2>

    <table>
      <tr>
        <th>Nom</th>
        <th>ID</th>
        <th>Membre depuis</th>
        <th>Solde</th>
        <th>Statut</th>
      </tr>
      <tr>
        <th>Margaret Nguyen</th>
        <td>427311</td>
        <td><time datetime="2010-06-03">3 juin 2010</time></td>
        <td>0.00</td>
        <td><strong>Inactif</strong></td>
      </tr>
      <tr>
        <th>Edvard Galinski</th>
        <td>533175</td>
        <td><time datetime="2011-01-13">13 janvier 2011</time></td>
        <td>37.00</td>
        <td>Actif</td>
      </tr>
      <tr>
        <th>Hoshi Nakamura</th>
        <td>601942</td>
        <td><time datetime="2012-07-23">23 juillet 2012</time></td>
        <td>15.00</td>
        <td>Actif</td>
      </tr>
      <tr>
        <th>Très très long nom pour tester le wrapping dans une cellule</th>
        <td>778299</td>
        <td><time datetime="2015-11-02">2 novembre 2015</time></td>
        <td>1234.56</td>
        <td>Suspendu</td>
      </tr>
    </table>

    <hr />

    <h2>Tableau avec contenu complexe</h2>

    <table>
      <tr>
        <th>Tâche</th>
        <th>Description</th>
        <th>Priorité</th>
      </tr>
      <tr>
        <td>Refactor UI</td>
        <td>
          Améliorer le <strong>système de menus flottants</strong> et corriger les bugs
          liés au scroll.
        </td>
        <td>Haute</td>
      </tr>
      <tr>
        <td>Tests</td>
        <td>
          <ul>
            <li>Tester sélection multiple</li>
            <li>Tester copier/coller</li>
            <li>Tester suppression de colonnes</li>
          </ul>
        </td>
        <td>Moyenne</td>
      </tr>
      <tr>
        <td>Documentation</td>
        <td>
          Ajouter des exemples avec :
          <ol>
            <li>Tableaux</li>
            <li>Listes</li>
            <li>Menus contextuels</li>
          </ol>
        </td>
        <td>Basse</td>
      </tr>
    </table>

    <hr />

    <h2>Code block</h2>
   

    <p>Fin du document de test ✨</p>
  `
}
